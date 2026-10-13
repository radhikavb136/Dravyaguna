/**
 * Vocabulary API
 */

import { apiClient } from './client.js';

export async function getFilterOptions() {
  return apiClient.get('/api/vocabulary/filters');
}

export async function createKarmaTerm(canonicalEn) {
  return apiClient.post('/api/vocabulary/karma', { canonical_en: canonicalEn });
}

export async function createIndicationTerm(canonicalEn) {
  return apiClient.post('/api/vocabulary/indications', { canonical_en: canonicalEn });
}
