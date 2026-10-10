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

export async function login(email, password, role) {
  const backendRole = ROLE_MAP[role] || role.toLowerCase();
  
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
}

export function isAuthenticated() {
  return !!apiClient.getToken();
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function setCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}
