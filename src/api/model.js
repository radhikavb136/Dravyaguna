/**
 * Self-Learning AI Model Client API
 * Manages adaptive relevance configuration, manual training triggers,
 * and learned query-herb concept associations.
 */

import { apiClient } from './client.js';

export async function getModelStatus() {
  return apiClient.get('/api/model/status');
}

export async function updateModelConfig(config) {
  return apiClient.put('/api/model/config', config);
}

export async function trainModel() {
  return apiClient.post('/api/model/train', {});
}

export async function recordFeedback({ queryText, herbId, interactionType = 'click' }) {
  if (!queryText || !herbId) return null;
  try {
    return await apiClient.post('/api/model/feedback', {
      queryText,
      herbId,
      interactionType,
    });
  } catch (err) {
    // Non-blocking interaction recording
    console.debug('Model interaction feedback deferred:', err?.message || err);
    return null;
  }
}

export async function listModelAssociations(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return apiClient.get(`/api/model/associations${queryString ? `?${queryString}` : ''}`);
}

export async function updateAssociationStatus(id, status) {
  return apiClient.patch(`/api/model/associations/${id}`, { status });
}

export async function deleteAssociation(id) {
  return apiClient.delete(`/api/model/associations/${id}`);
}
