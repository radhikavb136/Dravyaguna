/**
 * Vocabulary API
 */

import { apiClient } from './client.js';

export async function getFilterOptions() {
  return apiClient.get('/api/vocabulary/filters');
}
