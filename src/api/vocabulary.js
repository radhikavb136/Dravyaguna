/**
 * Vocabulary API
 */

import { apiClient } from './client.js';

let definitionCatalogPromise = null;

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

export async function getTermDefinitions(vocabulary, termNames) {
  const key = vocabulary === 'indication' ? 'indications' : vocabulary;
  if (!definitionCatalogPromise) definitionCatalogPromise = getFilterOptions();
  let options;
  try {
    options = await definitionCatalogPromise;
  } catch (error) {
    definitionCatalogPromise = null;
    throw error;
  }
  const requested = Array.isArray(termNames) ? termNames : [termNames];
  const terms = (options[key] || []).filter((term) =>
    requested.some((name) => String(name || '').toLowerCase() === String(term.canonical_en || '').toLowerCase())
  );
  return terms.map((term) => ({
    name: term.canonical_en,
    definition: term.definition_en || '',
    status: term.definition_status || 'draft',
  }));
}

function clearDefinitionCatalog() {
  definitionCatalogPromise = null;
}

export async function createKarmaTerm(canonicalEn) {
  clearDefinitionCatalog();
  return apiClient.post('/api/vocabulary/karma', { canonical_en: canonicalEn });
}

export async function createIndicationTerm(canonicalEn) {
  clearDefinitionCatalog();
  return apiClient.post('/api/vocabulary/indications', { canonical_en: canonicalEn });
}

export async function updateManagedTerm(category, id, canonicalEn) {
  clearDefinitionCatalog();
  return apiClient.patch(`/api/vocabulary/${category}/${id}`, {
    canonical_en: canonicalEn,
  });
}

export async function deleteManagedTerm(category, id) {
  clearDefinitionCatalog();
  return apiClient.delete(`/api/vocabulary/${category}/${id}`);
}

export async function mergeManagedTerms(category, sourceId, targetId) {
  clearDefinitionCatalog();
  return apiClient.post(`/api/vocabulary/${category}/${sourceId}/merge`, {
    target_id: targetId,
  });
}
