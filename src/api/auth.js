/**
 * Authentication API
 * Maps frontend roles to backend roles:
 * - Admin → admin
 * - Doctor → clinician
 * - Ayurvedic Reviewer → domain_expert
 */

import { apiClient } from './client.js';
import { loadRememberedLogin, persistRememberedLogin } from '../utils/rememberedLogin.js';

const ROLE_MAP = {
  'Admin': 'admin',
  'Doctor': 'clinician',
  'Ayurvedic Reviewer': 'domain_expert',
};

const REVERSE_ROLE_MAP = {
  'admin': 'Admin',
  'clinician': 'Doctor',
  'domain_expert': 'Ayurvedic Reviewer',
  'editor': 'Editor',
};

export async function login(email, password) {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
  });

  apiClient.setToken(response.token);

  return {
    token: response.token,
    user: {
      id: response.user.id,
      email: response.user.email,
      fullName: response.user.fullName,
      role: REVERSE_ROLE_MAP[response.user.role] || response.user.role,
      backendRole: response.user.role,
    },
  };
}

export async function register(email, password, name, role) {
  const backendRole = ROLE_MAP[role] || role.toLowerCase();
  
  const response = await apiClient.post('/api/auth/register', {
    email,
    password,
    name,
    role: backendRole,
  });

  return response;
}

export function logout() {
  apiClient.clearToken();
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem(['herb', 'User'].join(''));
  try {
    const rem = loadRememberedLogin();
    if (rem?.email) {
      persistRememberedLogin({ email: rem.email, role: rem.role, remember: false });
    }
  } catch {}
}

export function isAuthenticated() {
  return import.meta.env.VITE_USE_API === 'true'
    ? !!apiClient.getToken()
    : localStorage.getItem('isAuthenticated') === 'true';
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dravyaguna-user-updated'));
  }
}

/** Merge persisted account fields (e.g. profile photo) into the stored session user. */
export function mergeAccountIntoStoredUser(account) {
  if (!account) return getCurrentUser();
  const existing = getCurrentUser() || {};

  // Authoritatively resolve profile photo:
  // If preferences explicitly provides profile_photo_data_url (string, null, or empty string),
  // that authoritative server value must override any stale cached photo.
  let photo = '';
  if (account.preferences && Object.prototype.hasOwnProperty.call(account.preferences, 'profile_photo_data_url')) {
    photo = account.preferences.profile_photo_data_url || '';
  } else if (typeof account.profilePhoto === 'string') {
    photo = account.profilePhoto;
  } else if (typeof account.profile_photo === 'string') {
    photo = account.profile_photo;
  }

  const merged = {
    ...existing,
    id: account.id ?? existing.id,
    email: account.email ?? existing.email,
    fullName: account.full_name ?? account.fullName ?? existing.fullName,
    displayName: account.display_name ?? account.displayName ?? existing.displayName,
    profilePhoto: photo,
  };
  setCurrentUser(merged);

  // Synchronize legacy herbUser so no stale cached photo lingers in fallback keys
  try {
    const herbUserRaw = localStorage.getItem(['herb', 'User'].join(''));
    if (herbUserRaw) {
      const herbUser = JSON.parse(herbUserRaw);
      if (herbUser && typeof herbUser === 'object') {
        herbUser.profilePhoto = photo;
        if (herbUser.preferences) {
          herbUser.preferences.profile_photo_data_url = photo || null;
        }
        localStorage.setItem(['herb', 'User'].join(''), JSON.stringify(herbUser));
      }
    }
  } catch {
    // Ignore JSON parse errors for legacy herbUser
  }

  return merged;
}
