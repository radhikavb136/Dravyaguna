/**
 * Vocabulary API
 */

import { apiClient } from './client.js';

function adaptTermList(terms = []) {
  return terms.map((term) => ({
    ...term,
    canonical_en: term.label || term.canonical_en,
  }));
}

export async function getFilterOptions() {
  const response = await apiClient.get('/api/vocabulary/filters');
  const adapted = {};
  for (const [key, value] of Object.entries(response)) {
    adapted[key] = Array.isArray(value) ? adaptTermList(value) : value;
  }
  return adapted;
}

export async function createKarmaTerm(canonicalEn) {
  return apiClient.post('/api/vocabulary/karma', { canonical_en: canonicalEn });
}

export async function createIndicationTerm(canonicalEn) {
  return apiClient.post('/api/vocabulary/indications', { canonical_en: canonicalEn });
}

export async function updateManagedTerm(category, id, canonicalEn) {
  return apiClient.patch(`/api/vocabulary/${category}/${id}`, {
    canonical_en: canonicalEn,
  });
}

export async function deleteManagedTerm(category, id) {
  return apiClient.delete(`/api/vocabulary/${category}/${id}`);
}

export async function mergeManagedTerms(category, sourceId, targetId) {
  return apiClient.post(`/api/vocabulary/${category}/${sourceId}/merge`, {
    target_id: targetId,
  });
}
