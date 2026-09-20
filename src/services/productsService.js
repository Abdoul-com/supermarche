import { supabase } from './supabase.js';

const normalizeNumber = (value) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeProductPayload = (product = {}) => {
  const categoryId = product.category_id ?? product.categorie_id ?? null;
  const supplierId = product.supplier_id ?? product.fournisseur_id ?? null;

  const payload = {
    nom: String(product.nom ?? '').trim(),
    reference: String(product.reference ?? '').trim(),
    code_barres: product.code_barres ?? product.code_barre ?? '',
    marque: String(product.marque ?? '').trim(),
    unite: String(product.unite ?? '').trim(),
    category_id: categoryId !== null && categoryId !== undefined && categoryId !== '' ? Number(categoryId) : null,
    supplier_id: supplierId !== null && supplierId !== undefined && supplierId !== '' ? Number(supplierId) : null,
    prix_achat: normalizeNumber(product.prix_achat),
    prix_vente: normalizeNumber(product.prix_vente),
    stock_actuel: normalizeNumber(product.stock_actuel),
    stock_minimum: normalizeNumber(product.stock_minimum),
    date_expiration: product.date_expiration ? product.date_expiration : null,
    image: product.image ?? '',
    description: product.description ?? '',
    statut: product.statut !== undefined ? Boolean(product.statut) : true
  };

  return payload;
};

export async function getProducts() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProductById(id) {
  if (!supabase || !id) return null;

  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createProduct(product) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = normalizeProductPayload(product);
  const { data, error } = await supabase.from('products').insert(payload).select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function updateProduct(id, product) {
  if (!supabase || !id) {
    throw new Error('Identifiant produit invalide.');
  }

  const payload = normalizeProductPayload(product);
  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function deactivateProduct(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant produit invalide.');
  }

  const { data, error } = await supabase.from('products').update({ statut: false }).eq('id', id).select();
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function activateProduct(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant produit invalide.');
  }

  const { data, error } = await supabase.from('products').update({ statut: true }).eq('id', id).select();
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getCategories() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('categories').select('*').order('nom', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getSuppliers() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('suppliers').select('*').order('nom', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
