import { apiClient } from './client.js';

export const requestPasswordReset = (email) => apiClient.post('/api/auth/password-reset/request', { email });
export const confirmPasswordReset = (token, password) => apiClient.post('/api/auth/password-reset/confirm', { token, password });
