/**
 * Admin API
 * Audit Log, Search Analytics, User & Role Management
 */

import { apiClient } from './client.js';

export async function getAuditLog(params = {}) {
  const { limit = 50, offset = 0 } = params;
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set('limit', limit);
  if (offset) queryParams.set('offset', offset);
  
  return apiClient.get(`/api/audit-log?${queryParams}`);
}

export async function getSearchAnalytics() {
  return apiClient.get('/api/analytics/search?days=90');
}

export async function getUsers() {
  return apiClient.get('/api/users');
}

export async function updateUserRole(userId, role) {
  return apiClient.patch(`/api/users/${userId}/role`, { role });
}

export async function updateUserStatus(userId, status) {
  return apiClient.patch(`/api/users/${userId}/status`, { status });
}

export async function updateUserDetails(userId, details) {
  return apiClient.patch(`/api/users/${userId}`, details);
}

export async function createUser({ email, password, fullName, role }) {
  return apiClient.post('/api/users', {
    email,
    password,
    fullName,
    role,
  });
}
