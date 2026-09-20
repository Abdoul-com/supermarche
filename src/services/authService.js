import { supabase } from './supabase.js';

export async function signIn(email, password) {
  if (!supabase) {
    throw new Error('Supabase n\'est pas configure. Verifiez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Veuillez saisir un email et un mot de passe.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword
  });

  if (error) {
    throw new Error(error.message || 'Identifiants invalides.');
  }

  return data;
}

export async function signOut() {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'La deconnexion a echoue.');
  }

  return { error: null };
}

export async function getCurrentSession() {
  if (!supabase) {
    return { data: { session: null }, error: null };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Impossible de verifier la session.');
  }

  return { data, error: null };
}

export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (String(error.message).toLowerCase().includes('session')) {
      return null;
    }
    throw new Error(error.message || 'Impossible de recuperer l\'utilisateur connecte.');
  }

  return user || null;
}

export function onAuthStateChange(callback) {
  if (!supabase || typeof callback !== 'function') {
    return () => {};
  }

  return supabase.auth.onAuthStateChange(callback);
}
