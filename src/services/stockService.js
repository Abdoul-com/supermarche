import { supabase } from './supabase.js';

const normalizeNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeType = (value) => {
  const readable = String(value ?? '').trim();
  const map = {
    ENTREE: 'ENTREE',
    SORTIE: 'SORTIE',
    'AJUSTEMENT POSITIF': 'AJUSTEMENT_POSITIF',
    'AJUSTEMENT_POSITIF': 'AJUSTEMENT_POSITIF',
    'AJUSTEMENT NEGATIF': 'AJUSTEMENT_NEGATIF',
    'AJUSTEMENT_NEGATIF': 'AJUSTEMENT_NEGATIF',
    'Entrée': 'ENTREE',
    'Sortie': 'SORTIE',
    'Ajustement positif': 'AJUSTEMENT_POSITIF',
    'Ajustement négatif': 'AJUSTEMENT_NEGATIF'
  };
  return map[readable] || readable.toUpperCase().replace(/\s+/g, '_');
};

export async function getCategories() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getStockProducts() {
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

export async function getStockMovements() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateProductStock(productId, nextStock) {
  if (!supabase || !productId) {
    throw new Error('Produit invalide pour la mise à jour du stock.');
  }

  const { data, error } = await supabase
    .from('products')
    .update({ stock_actuel: normalizeNumber(nextStock) })
    .eq('id', productId)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function createStockMovement(movement = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const productId = Number(movement.product_id ?? movement.productId ?? 0);
  const type = normalizeType(movement.type);
  const quantity = normalizeNumber(movement.quantity ?? movement.quantite ?? 0);

  if (!productId) {
    throw new Error('Un produit est obligatoire pour enregistrer un mouvement.');
  }

  if (!type) {
    throw new Error('Le type de mouvement est obligatoire.');
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('La quantité doit être supérieure à 0.');
  }

  const allowedTypes = ['ENTREE', 'SORTIE', 'AJUSTEMENT_POSITIF', 'AJUSTEMENT_NEGATIF'];
  if (!allowedTypes.includes(type)) {
    throw new Error('Type de mouvement non pris en charge.');
  }

  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, stock_actuel, stock_minimum, stock_maximum')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw productError;
  if (!productData) {
    throw new Error('Produit introuvable.');
  }

  const previousStock = normalizeNumber(productData.stock_actuel);
  let nextStock = previousStock;

  if (type === 'ENTREE' || type === 'AJUSTEMENT_POSITIF') {
    nextStock = previousStock + quantity;
  }

  if (type === 'SORTIE' || type === 'AJUSTEMENT_NEGATIF') {
    if (quantity > previousStock) {
      throw new Error(`Stock insuffisant. Quantité demandée: ${quantity}. Stock disponible: ${previousStock}.`);
    }
    nextStock = previousStock - quantity;
  }

  // La première version applique la logique côté frontend avec validation explicite
  // avant d’insérer le mouvement. Il n’existe pas de RPC transactionnelle dans le projet.
  const updatedProduct = await updateProductStock(productId, nextStock);

  const payload = {
    product_id: productId,
    user_id: movement.user_id ?? 1,
    type,
    quantite: quantity,
    stock_avant: previousStock,
    stock_apres: nextStock,
    reference_type: movement.reference_type ?? 'manual',
    reference_id: movement.reference_id ?? null,
    motif: movement.motif ?? '',
    created_at: movement.date_mouvement ?? movement.created_at ?? new Date().toISOString()
  };

  const { data, error } = await supabase.from('stock_movements').insert(payload).select();

  if (error) {
    await updateProductStock(productId, previousStock);
    throw error;
  }

  return {
    movement: data?.[0] ?? null,
    product: updatedProduct
  };
}
