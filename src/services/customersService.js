import { supabase } from './supabase.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

export async function getCustomers() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true })
    .order('prenom', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerById(id) {
  if (!supabase || !id) {
    return null;
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createCustomer(customer = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = {
    nom: normalizeString(customer.nom),
    prenom: normalizeString(customer.prenom),
    telephone: normalizeString(customer.telephone),
    email: normalizeString(customer.email),
    adresse: normalizeString(customer.adresse)
  };

  if (!payload.nom) {
    throw new Error('Le nom du client est obligatoire.');
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('L’adresse email est invalide.');
  }

  if (Object.prototype.hasOwnProperty.call(customer, 'active')) {
    payload.active = Boolean(customer.active);
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function updateCustomer(id, customer = {}) {
  if (!supabase || !id) {
    throw new Error('Identifiant du client introuvable.');
  }

  const payload = {
    nom: normalizeString(customer.nom),
    prenom: normalizeString(customer.prenom),
    telephone: normalizeString(customer.telephone),
    email: normalizeString(customer.email),
    adresse: normalizeString(customer.adresse)
  };

  if (!payload.nom) {
    throw new Error('Le nom du client est obligatoire.');
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('L’adresse email est invalide.');
  }

  if (Object.prototype.hasOwnProperty.call(customer, 'active')) {
    payload.active = Boolean(customer.active);
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function deactivateCustomer(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant du client introuvable.');
  }

  const { data, error } = await supabase
    .from('customers')
    .select('active')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!Object.prototype.hasOwnProperty.call(data ?? {}, 'active')) {
    throw new Error('La table customers ne contient pas de colonne active dans le schéma actuel.');
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update({ active: false })
    .eq('id', id);

  if (updateError) throw updateError;
  return true;
}

export async function activateCustomer(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant du client introuvable.');
  }

  const { data, error } = await supabase
    .from('customers')
    .select('active')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!Object.prototype.hasOwnProperty.call(data ?? {}, 'active')) {
    throw new Error('La table customers ne contient pas de colonne active dans le schéma actuel.');
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update({ active: true })
    .eq('id', id);

  if (updateError) throw updateError;
  return true;
}

export async function getCustomerSales(customerId) {
  if (!supabase || !customerId) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('customer_id', customerId)
    .order('date_vente', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function saveCustomer(customer) {
  if (customer?.id) {
    return updateCustomer(customer.id, customer);
  }
  return createCustomer(customer);
}
