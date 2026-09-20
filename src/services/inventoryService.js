import { supabase } from './supabase.js';

const normalizeNumber = (value, fallback = 0) => {
  const numericValue = Number(value ?? fallback);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getFirstDefined = (record, keys = []) => {
  if (!record || typeof record !== 'object') return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }

  return undefined;
};

const resolveInventoryStatus = (record = {}) => getFirstDefined(record, ['status', 'statut', 'etat', 'state']) ?? 'en_cours';
const resolveInventoryReference = (record = {}) => getFirstDefined(record, ['reference', 'ref', 'numero', 'numero_reference', 'code']) ?? `INV-${record.id ?? 'NEW'}`;
const resolveDateValue = (record = {}) => getFirstDefined(record, ['date_inventaire', 'date', 'date_inventory', 'created_at']) ?? new Date().toISOString();

export async function getProductsForInventory() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getInventories() {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false, nullsLast: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    const { data, error: fallbackError } = await supabase
      .from('inventory')
      .select('*');

    if (fallbackError) throw fallbackError;
    return data ?? [];
  }
}

export async function getInventoryById(id) {
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createInventory(input = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = {
    user_id: Number(input.user_id ?? 3),
    statut: resolveInventoryStatus(input) || 'en_cours',
    notes: getFirstDefined(input, ['notes', 'note', 'observations']) ?? '',
    created_at: input.created_at ?? new Date().toISOString()
  };

  if (input.date || input.date_inventaire) {
    payload.date_inventaire = input.date ?? input.date_inventaire ?? new Date().toISOString();
  } else {
    payload.date_inventaire = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('inventory')
    .insert(payload)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getInventoryItems(inventoryId) {
  if (!supabase || !inventoryId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('id', { ascending: true, nullsLast: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    const { data, error: fallbackError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('inventory_id', inventoryId);

    if (fallbackError) throw fallbackError;
    return data ?? [];
  }
}

export async function saveInventoryItem(item = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const inventoryId = Number(item.inventory_id ?? item.inventoryId ?? 0);
  const productId = Number(item.product_id ?? item.productId ?? 0);

  if (!inventoryId || !productId) {
    throw new Error('L’inventaire et le produit sont obligatoires.');
  }

  const theoreticalStock = normalizeNumber(item.theoretical_stock ?? item.stock_theorique ?? item.stock_theory ?? 0, 0);
  const physicalStock = normalizeNumber(item.physical_stock ?? item.stock_physique ?? item.stock_reel ?? 0, 0);
  const ecart = normalizeNumber(item.ecart ?? item.difference ?? item.variation ?? physicalStock - theoreticalStock, 0);

  if (physicalStock < 0) {
    throw new Error('La quantité physique ne peut pas être négative.');
  }

  const payload = {
    inventory_id: inventoryId,
    product_id: productId,
    stock_theorique: theoreticalStock,
    stock_reel: physicalStock,
    difference: ecart,
    motif: item.motif ?? item.note ?? 'Comptage d’inventaire'
  };

  const { data: existingItem, error: lookUpError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('inventory_id', inventoryId)
    .eq('product_id', productId)
    .maybeSingle();

  if (lookUpError) throw lookUpError;

  let data;
  let error;

  if (existingItem) {
    ({ data, error } = await supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', existingItem.id)
      .select());
  } else {
    ({ data, error } = await supabase
      .from('inventory_items')
      .insert(payload)
      .select());
  }

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function closeInventory(inventoryId, items = []) {
  if (!supabase || !inventoryId) {
    throw new Error('Inventaire invalide.');
  }

  const inventory = await getInventoryById(inventoryId);
  if (!inventory) {
    throw new Error('Inventaire introuvable.');
  }

  const currentStatus = resolveInventoryStatus(inventory).toLowerCase();
  if (currentStatus.includes('clot') || currentStatus.includes('ferme') || currentStatus.includes('closed') || currentStatus.includes('final') || currentStatus.includes('termine')) {
    throw new Error('L’inventaire est déjà clôturé.');
  }

  const itemRows = Array.isArray(items) ? items : [];

  for (const item of itemRows) {
    const productId = Number(item.product_id ?? item.productId ?? 0);
    if (!productId) continue;

    const theoreticalStock = normalizeNumber(item.theoretical_stock ?? item.stock_theorique ?? 0, 0);
    const physicalStock = normalizeNumber(item.physical_stock ?? item.stock_physique ?? item.stock_reel ?? 0, 0);
    const ecart = physicalStock - theoreticalStock;

    if (ecart !== 0) {
      const productResult = await supabase
        .from('products')
        .select('id, stock_actuel')
        .eq('id', productId)
        .maybeSingle();

      if (productResult.error) throw productResult.error;

      const previousStock = normalizeNumber(productResult.data?.stock_actuel ?? theoreticalStock, 0);
      const nextStock = physicalStock;

      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ stock_actuel: nextStock })
        .eq('id', productId);

      if (productUpdateError) throw productUpdateError;

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          user_id: inventory.user_id ?? 3,
          quantite: Math.abs(ecart),
          type: ecart > 0 ? 'AJUSTEMENT_POSITIF' : 'AJUSTEMENT_NEGATIF',
          stock_avant: previousStock,
          stock_apres: nextStock,
          reference_type: 'inventory',
          reference_id: inventoryId,
          motif: `Inventaire ${resolveInventoryReference(inventory)}`,
          created_at: new Date().toISOString()
        });

      if (movementError) throw movementError;
    }

    const inventoryItemPayload = {
      inventory_id: inventoryId,
      product_id: productId,
      stock_theorique: theoreticalStock,
      stock_reel: physicalStock,
      difference: ecart,
      motif: item.motif ?? `Inventaire ${resolveInventoryReference(inventory)}`
    };

    const upsertPayload = { ...inventoryItemPayload };
    if (item.id) {
      upsertPayload.id = Number(item.id);
    }

    const { error: inventoryItemError } = await supabase
      .from('inventory_items')
      .upsert(upsertPayload)
      .select();

    if (inventoryItemError) throw inventoryItemError;
  }

  const closeField = ['status', 'statut', 'etat', 'state'].find((key) => Object.prototype.hasOwnProperty.call(inventory, key)) || 'statut';
  const closeStatus = 'termine';

  const { data, error } = await supabase
    .from('inventory')
    .update({ [closeField]: closeStatus })
    .eq('id', inventoryId)
    .select();

  if (error) throw error;

  return data?.[0] ?? null;
}
