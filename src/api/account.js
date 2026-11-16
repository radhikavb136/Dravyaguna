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

export async function updateAccountEmail(newEmail, password) {
  const response = await apiClient.post('/api/account/email', { newEmail, password });
  return response.data;
}

export async function updateAccountProfilePhoto(profilePhotoDataUrl) {
  const response = await apiClient.patch('/api/account/profile-photo', {
    profilePhotoDataUrl,
  });
  return response.data;
}
