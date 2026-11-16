const API_URL = process.env.E2E_API_URL || 'http://localhost:4010';

export function devPassword() {
  return process.env.DEV_USER_PASSWORD || 'Dev1234567';
}

export const DEV_USERS = {
  admin: 'dev-admin@test.com',
  editor: 'dev-editor@test.com',
  expert: 'dev-expert@test.com',
  clinician: 'dev-clinician@test.com',
};

export async function apiLogin(email) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: devPassword() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Login failed (${response.status})`);
  }
  return { token: data.token, user: data.user };
}

export async function apiRequest(token, method, path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

export async function createE2eHerb(editorToken, stamp) {
  const code = `zz_e2e_${stamp}`;
  const { status, data } = await apiRequest(editorToken, 'POST', '/api/herbs', {
    code,
    english_name: `ZZ E2E Herb ${stamp}`,
    botanical_name: 'E2E botanical',
    status: 'draft',
  });
  if (status !== 201) {
    throw new Error(data.error || `Create herb failed (${status})`);
  }
  return data;
}

export async function verifyHerb(expertToken, herbId) {
  return apiRequest(expertToken, 'POST', `/api/herbs/${herbId}/verify`, {});
}

export async function updateHerb(editorToken, herbId, patch) {
  return apiRequest(editorToken, 'PUT', `/api/herbs/${herbId}`, patch);
}

export async function archiveHerb(adminToken, herbId) {
  return apiRequest(adminToken, 'DELETE', `/api/herbs/${herbId}`, undefined);
}

export async function listHerbs(token, query = '') {
  return apiRequest(token, 'GET', `/api/herbs?limit=5${query ? `&${query}` : ''}`, undefined);
}

export async function getHerbByIdApi(token, herbId) {
  return apiRequest(token, 'GET', `/api/herbs/${herbId}`, undefined);
}

export async function getAccountApi(token) {
  return apiRequest(token, 'GET', '/api/account', undefined);
}

export async function loginWithPassword(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

export async function createUserAsAdmin(adminToken, payload) {
  return apiRequest(adminToken, 'POST', '/api/users', payload);
}

export async function setUserStatus(adminToken, userId, status) {
  return apiRequest(adminToken, 'PATCH', `/api/users/${userId}/status`, { status });
}

export async function createVocabularyTerm(token, category, canonicalEn) {
  const path = category === 'indications' ? '/api/vocabulary/indications' : `/api/vocabulary/${category}`;
  return apiRequest(token, 'POST', path, { canonical_en: canonicalEn });
}

export async function deleteVocabularyTerm(adminToken, category, termId) {
  return apiRequest(adminToken, 'DELETE', `/api/vocabulary/${category}/${termId}`, undefined);
}

export async function getScoringWeights(token) {
  return apiRequest(token, 'GET', '/api/scoring/weights', undefined);
}

export async function updateScoringWeights(token, weights) {
  return apiRequest(token, 'PUT', '/api/scoring/weights/bulk', { weights });
}

export async function mergeVocabularyTerms(adminToken, category, sourceId, targetId) {
  return apiRequest(adminToken, 'POST', `/api/vocabulary/${category}/${sourceId}/merge`, {
    target_id: targetId,
  });
}

export async function getVocabularyFilters(token) {
  return apiRequest(token, 'GET', '/api/vocabulary/filters', undefined);
}

export async function updateVocabularyTerm(adminToken, category, termId, canonicalEn) {
  return apiRequest(adminToken, 'PATCH', `/api/vocabulary/${category}/${termId}`, {
    canonical_en: canonicalEn,
  });
}

export async function mergeVocabularyTermsAdmin(adminToken, sourceId, targetId) {
  return mergeVocabularyTerms(adminToken, 'karma', sourceId, targetId);
}

export async function simpleSearch(token, query) {
  return apiRequest(token, 'POST', '/api/search/simple', { query, limit: 5 });
}
