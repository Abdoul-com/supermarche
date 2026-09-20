import { getCurrentUser, getCurrentSession } from '../services/authService.js';
import { getRoles, getUsers } from '../services/usersService.js';

export function normalizeEmail(value = '') {
  return String(value ?? '').trim().toLowerCase();
}

export async function resolveAuthContext() {
  const sessionResponse = await getCurrentSession();
  const session = sessionResponse?.data?.session ?? null;
  const authUser = session ? await getCurrentUser() : null;

  let profile = null;
  let roleName = null;

  if (authUser?.email) {
    try {
      const users = await getUsers();
      const roles = await getRoles();
      profile = (users || []).find((user) => normalizeEmail(user.email) === normalizeEmail(authUser.email)) || null;
      if (profile && profile.role_id) {
        roleName = (roles || []).find((role) => String(role.id) === String(profile.role_id))?.nom || null;
      }
    } catch (error) {
      console.warn('Profil app non trouve ou inaccessible:', error);
    }
  }

  return {
    session,
    user: authUser,
    profile,
    roleName
  };
}

export async function requireAuthContext() {
  const authContext = await resolveAuthContext();
  if (!authContext.session || !authContext.user) {
    return {
      session: null,
      user: null,
      profile: null,
      roleName: null
    };
  }

  return authContext;
}
