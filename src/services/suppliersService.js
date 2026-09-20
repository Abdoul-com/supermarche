import { supabase } from './supabase.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeSupplierPayload = (supplier = {}) => ({
  nom: normalizeString(supplier.nom),
  contact: normalizeString(supplier.contact),
  telephone: normalizeString(supplier.telephone),
  email: normalizeString(supplier.email),
  adresse: normalizeString(supplier.adresse),
  statut: Object.prototype.hasOwnProperty.call(supplier, 'statut') ? Boolean(supplier.statut) : true
});

export async function getSuppliers() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSupplierById(id) {
  if (!supabase || !id) {
    return null;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createSupplier(data = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = normalizeSupplierPayload(data);
  if (!payload.nom) {
    throw new Error('Le nom du fournisseur est obligatoire.');
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('L’adresse email du fournisseur est invalide.');
  }

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert(payload)
    .select();

  if (error) throw error;
  return supplier?.[0] ?? null;
}

export async function updateSupplier(id, data = {}) {
  if (!supabase || !id) {
    throw new Error('Identifiant du fournisseur invalide.');
  }

  const payload = normalizeSupplierPayload(data);
  if (!payload.nom) {
    throw new Error('Le nom du fournisseur est obligatoire.');
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('L’adresse email du fournisseur est invalide.');
  }

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return supplier?.[0] ?? null;
}

export async function deactivateSupplier(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant du fournisseur invalide.');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('statut')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'statut')) {
    throw new Error('La table suppliers ne contient pas de colonne statut dans le schéma actuel.');
  }

  const { error: updateError } = await supabase
    .from('suppliers')
    .update({ statut: false })
    .eq('id', id);

  if (updateError) throw updateError;
  return true;
}

export async function activateSupplier(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant du fournisseur invalide.');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('statut')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'statut')) {
    throw new Error('La table suppliers ne contient pas de colonne statut dans le schéma actuel.');
  }

  const { error: updateError } = await supabase
    .from('suppliers')
    .update({ statut: true })
    .eq('id', id);

  if (updateError) throw updateError;
  return true;
}

export async function getSupplierProducts(supplierId) {
  if (!supabase || !supplierId) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSupplierPurchases(supplierId) {
  if (!supabase || !supplierId) {
    return [];
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('date_achat', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveSuppliers() {
  const suppliers = await getSuppliers();
  return suppliers.filter((supplier) => supplier.statut !== false);
}
