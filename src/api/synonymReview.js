import { apiClient } from './client.js';

export async function listSynonymReviews({ status = 'draft', vocabulary, limit = 25, offset = 0 } = {}) {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  if (vocabulary) params.set('vocabulary', vocabulary);
  return apiClient.get(`/api/vocabulary/synonyms/review?${params.toString()}`);
}

export async function getSynonymReview(id) {
  return apiClient.get(`/api/vocabulary/synonyms/review/${id}`);
}

export async function approveSynonymReview(id) {
  return apiClient.post(`/api/vocabulary/synonyms/review/${id}/approve`, {});
}

export async function rejectSynonymReview(id, reason) {
  return apiClient.post(`/api/vocabulary/synonyms/review/${id}/reject`, { reason });
}

export async function proposeSynonymReview({ vocabulary, termId, languageCode, text }) {
  return apiClient.post('/api/vocabulary/synonyms/propose', {
    vocabulary,
    termId,
    languageCode,
    text,
  });
}
