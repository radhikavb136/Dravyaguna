import { apiClient } from './client.js';

export async function getAccount() {
  const response = await apiClient.get('/api/account');
  return response.data;
}

export async function updateAccountProfile(profile) {
  const response = await apiClient.patch('/api/account/profile', profile);
  return response.data;
}

export async function updateAccountPreferences(preferences) {
  const response = await apiClient.patch('/api/account/preferences', preferences);
  return response.data;
}

export async function changeAccountPassword(currentPassword, newPassword) {
  return apiClient.post('/api/account/password', { currentPassword, newPassword });
}
