/**
 * Scoring Weights API
 */

import { apiClient } from './client.js';

export async function getWeights() {
  return apiClient.get('/api/scoring/weights');
}

export async function updateWeight(parameterGroup, weight) {
  return apiClient.put('/api/scoring/weights', { parameter_group: parameterGroup, weight });
}

export async function updateWeights(weights) {
  return apiClient.put('/api/scoring/weights/bulk', { weights });
}
