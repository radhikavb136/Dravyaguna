/**
 * Authentication API
 * Maps frontend roles to backend roles:
 * - Admin → admin
 * - Doctor → clinician
 * - Ayurvedic Reviewer → domain_expert
 */

import { apiClient } from './client.js';

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
}
