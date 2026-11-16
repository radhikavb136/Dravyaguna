import { apiClient } from './client.js';

export async function submitSupportRequest({ topic, message }) {
  const response = await apiClient.post('/api/support/requests', { topic, message });
  return response.data;
}

export async function getMySupportRequests() {
  const response = await apiClient.get('/api/support/requests/mine');
  return response.data;
}

export async function listSupportRequests({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiClient.get(`/api/support/requests?${params.toString()}`);
}

export async function updateSupportRequestStatus(requestId, status) {
  const response = await apiClient.patch(`/api/support/requests/${requestId}`, { status });
  return response.data;
}
