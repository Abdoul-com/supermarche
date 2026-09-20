import { supabase } from './supabase.js';

const userSafeFields = ['nom', 'prenom', 'telephone', 'email', 'username', 'role_id', 'statut', 'updated_at'];
const PASSWORD_PLACEHOLDER = '__pending_auth__';

function normalizeStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'actif';
  if (['actif', 'active', 'enabled', 'true', '1'].includes(raw)) return 'actif';
  if (['inactif', 'inactive', 'disabled', 'false', '0'].includes(raw)) return 'inactif';
  return raw;
}

function sanitizeUserPayload(data = {}) {
  const payload = {};

  for (const field of userSafeFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') continue;
    if (field === 'role_id') {
      payload[field] = Number(data[field]);
      continue;
    }
    if (field === 'statut') {
      payload[field] = normalizeStatus(data[field]);
      continue;
    }
    payload[field] = data[field];
  }

  if (data?.password !== undefined && data.password !== null && String(data.password).trim() !== '') {
    // Le stockage de nouveaux mots de passe en clair n'est pas autorisé dans cette étape.
    // La vraie authentification sera gérée avec Supabase Auth plus tard.
  }

  return payload;
}

export async function getUsers() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Impossible de charger les utilisateurs.');
  }

  return data ?? [];
}

export async function getUserById(id) {
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible de charger l’utilisateur.');
  }

  return data;
}

export async function getRoles() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Impossible de charger les rôles.');
  }

  return data ?? [];
}

export async function getUserActivity(id) {
  if (!supabase || !id) return [];

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function createUserProfile(data = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = sanitizeUserPayload(data);

  if (!payload.nom && !payload.username && !payload.email) {
    throw new Error('Au moins un identifiant de profil est requis.');
  }

  const record = {
    ...payload,
    password: PASSWORD_PLACEHOLDER,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    statut: normalizeStatus(payload.statut || 'actif')
  };

  const { data: inserted, error } = await supabase
    .from('users')
    .insert([record])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible de créer le profil utilisateur.');
  }

  return inserted;
}

export async function updateUser(id, data = {}) {
  if (!supabase || !id) {
    throw new Error('Identifiant utilisateur invalide.');
  }

  const payload = sanitizeUserPayload(data);
  if (!Object.keys(payload).length) {
    return getUserById(id);
  }

  payload.updated_at = new Date().toISOString();
  // La colonne password n'est pas exposée pour la préparation de profil ;
  // on conserve la valeur existante sans jamais la réécrire en clair.

  const { data: updated, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible de modifier l’utilisateur.');
  }

  return updated;
}

export async function activateUser(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant utilisateur invalide.');
  }

  const { data, error } = await supabase
    .from('users')
    .update({ statut: 'actif', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible d’activer l’utilisateur.');
  }

  return data;
}

export async function deactivateUser(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant utilisateur invalide.');
  }

  const { data, error } = await supabase
    .from('users')
    .update({ statut: 'inactif', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Impossible de désactiver l’utilisateur.');
  }

  return data;
}
