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
  return apiClient.get('/api/analytics/search');
}

export async function getUsers() {
  return apiClient.get('/api/users');
}

export async function updateUserRole(userId, role) {
  return apiClient.patch(`/api/users/${userId}/role`, { role });
}
