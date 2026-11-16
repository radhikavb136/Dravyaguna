import { apiClient, USE_API } from './client.js';

export async function getHealth() {
  if (!USE_API) {
    return { billingConfigured: false };
  }
  return apiClient.get('/api/health');
}
