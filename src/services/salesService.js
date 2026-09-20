import { supabase } from './supabase.js';

const moneyFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function normalizeNumber(value) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function formatCurrency(value) {
  return `${moneyFormatter.format(normalizeNumber(value))} FCFA`;
}

export function buildSaleSummary(items = []) {
  const sousTotal = items.reduce((sum, item) => {
    const quantity = normalizeNumber(item.quantity);
    const unitPrice = normalizeNumber(item.prix_vente ?? item.prix_unitaire ?? 0);
    return sum + (unitPrice * quantity);
  }, 0);

  const remise = items.reduce((sum, item) => sum + normalizeNumber(item.remise), 0);
  const total = Math.max(0, sousTotal - remise);

  return {
    sousTotal,
    remise,
    total
  };
}

export function validateCartItem({ product, quantity, remise = 0 }) {
  if (!product) {
    return { valid: false, message: 'Produit introuvable.' };
  }

  if (product.statut === false || product.statut === 0) {
    return { valid: false, message: `Le produit ${product.nom || 'sélectionné'} est inactif.` };
  }

  const qt = normalizeNumber(quantity);
  const stock = normalizeNumber(product.stock_actuel);
  const unitPrice = normalizeNumber(product.prix_vente ?? product.prix_unitaire ?? 0);
  const discount = normalizeNumber(remise);

  if (!Number.isFinite(qt) || qt <= 0) {
    return { valid: false, message: 'La quantité doit être supérieure à 0.' };
  }

  if (qt > stock) {
    return { valid: false, message: `Stock insuffisant pour ${product.nom || 'ce produit'}. Stock disponible: ${stock}.` };
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { valid: false, message: 'Le prix du produit est invalide.' };
  }

  if (discount < 0 || discount > unitPrice * qt) {
    return { valid: false, message: 'La remise ne peut pas dépasser le montant de la ligne.' };
  }

  return { valid: true, message: 'OK' };
}

export async function getProductsForSale() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('statut', true)
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCustomers() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPayments() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date_paiement', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSales() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date_vente', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSaleById(saleId) {
  if (!supabase || !saleId) {
    return null;
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .maybeSingle();

  if (saleError) throw saleError;
  if (!sale) return null;

  const [{ data: items = [] }, { data: payment = null }] = await Promise.all([
    supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId)
      .order('id', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .eq('sale_id', saleId)
      .maybeSingle()
  ]);

  return {
    sale,
    items: items ?? [],
    payment: payment ?? null
  };
}

function generateSaleNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seed = String(Date.now()).slice(-6);
  return `VTE-${year}-${seed}`;
}

export async function createSale(salePayload = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const items = Array.isArray(salePayload.items) ? salePayload.items : [];
  if (!items.length) {
    throw new Error('Le panier ne peut pas être vide.');
  }

  const summary = buildSaleSummary(items);
  if (summary.total <= 0) {
    throw new Error('Le montant total de la vente est invalide.');
  }

  const saleNumber = salePayload.numero_vente || generateSaleNumber();
  const saleInput = {
    customer_id: salePayload.customer_id ?? null,
    user_id: salePayload.user_id ?? 1,
    numero_vente: saleNumber,
    date_vente: salePayload.date_vente || new Date().toISOString(),
    montant_total: summary.sousTotal,
    remise: summary.remise,
    montant_final: summary.total,
    statut: 'valide'
  };

  let saleId = null;

  try {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert(saleInput)
      .select();

    if (saleError) throw saleError;
    const sale = saleData?.[0];
    if (!sale) {
      throw new Error('La vente n’a pas pu être créée.');
    }

    saleId = sale.id;

    const saleItemsPayload = items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantite: normalizeNumber(item.quantity),
      prix_unitaire: normalizeNumber(item.prix_vente ?? item.prix_unitaire ?? 0),
      remise: normalizeNumber(item.remise)
    }));

    const { error: saleItemsError } = await supabase.from('sale_items').insert(saleItemsPayload);
    if (saleItemsError) throw saleItemsError;

    const paymentPayload = {
      sale_id: sale.id,
      montant: summary.total,
      mode_paiement: salePayload.mode_paiement || 'especes',
      reference: salePayload.payment_reference || null,
      date_paiement: new Date().toISOString(),
      statut: 'valide'
    };

    const { error: paymentError } = await supabase.from('payments').insert(paymentPayload);
    if (paymentError) throw paymentError;

    for (const item of items) {
      const productId = Number(item.product_id);
      if (!productId) continue;

      const { data: currentProductData, error: productLookupError } = await supabase
        .from('products')
        .select('id, stock_actuel, nom')
        .eq('id', productId)
        .maybeSingle();

      if (productLookupError) throw productLookupError;
      if (!currentProductData) {
        throw new Error(`Produit introuvable pour la vente: ${productId}.`);
      }

      const quantityToRemove = normalizeNumber(item.quantity);
      const stockBefore = normalizeNumber(currentProductData.stock_actuel);
      const stockAfter = Math.max(0, stockBefore - quantityToRemove);

      if (stockBefore < quantityToRemove) {
        throw new Error(`Stock insuffisant pour ${currentProductData.nom || 'un produit'}.`);
      }

      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({ stock_actuel: stockAfter })
        .eq('id', productId);

      if (stockUpdateError) throw stockUpdateError;

      const { error: movementError } = await supabase.from('stock_movements').insert({
        product_id: productId,
        user_id: salePayload.user_id ?? 1,
        type: 'SORTIE',
        quantite: quantityToRemove,
        stock_avant: stockBefore,
        stock_apres: stockAfter,
        reference_type: 'sale',
        reference_id: sale.id,
        motif: 'Sortie suite à une vente',
        created_at: new Date().toISOString()
      });

      if (movementError) throw movementError;
    }

    return {
      ...saleInput,
      id: sale.id,
      numero_vente: saleNumber,
      details: { sale, items: saleItemsPayload, payment: paymentPayload }
    };
  } catch (error) {
    if (saleId) {
      try {
        await supabase.from('payments').delete().eq('sale_id', saleId);
        await supabase.from('sale_items').delete().eq('sale_id', saleId);
        await supabase.from('sales').delete().eq('id', saleId);
      } catch (cleanupError) {
        console.error('Erreur nettoyage sale:', cleanupError);
      }
    }
    throw error;
  }
}

export async function createSaleTransaction(salePayload = {}) {
  try {
    const { data, error } = await supabase.rpc('create_sale_transaction', {
      payload: salePayload
    });
    if (error) throw error;
    return data;
  } catch (error) {
    return createSale(salePayload);
  }
}
