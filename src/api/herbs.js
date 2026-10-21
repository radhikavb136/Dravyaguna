/**
 * Herbs API adapter
 * Converts backend API responses to frontend data shapes
 */

import { apiClient } from './client.js';

/**
 * Convert backend herb shape to frontend shape
 */
function adaptHerb(backendHerb) {
  return {
    id: backendHerb.id,
    code: backendHerb.code,
    englishName: backendHerb.english_name ?? backendHerb.englishName,
    botanicalName: backendHerb.botanical_name ?? backendHerb.botanicalName,
    sanskritName: backendHerb.sanskrit_name ?? backendHerb.sanskritName,
    localName: backendHerb.local_name ?? backendHerb.localName,
    family: backendHerb.family,
    partUsed: backendHerb.part_used ?? backendHerb.partUsed,
    description: backendHerb.description,
    translations: backendHerb.translations || {},
    language: backendHerb.language || 'en-IN',
    identificationNotes: backendHerb.identification_notes ?? backendHerb.identificationNotes,
    classicalReferences: backendHerb.references ?? backendHerb.classical_references ?? [],
    prabhava: backendHerb.prabhava,
    imageUrl: backendHerb.image_url ?? backendHerb.imageUrl,
    status: backendHerb.status,
    verificationStatus: backendHerb.status,
    createdAt: backendHerb.created_at ?? backendHerb.createdAt,
    updatedAt: backendHerb.updated_at ?? backendHerb.updatedAt,
    
    // Arrays (from relationships)
    rasa: backendHerb.rasa || [],
    guna: backendHerb.guna || [],
    karma: backendHerb.karma || [],
    indications: backendHerb.indications || [],
    dhatu: backendHerb.dhatu || [],
    srotas: backendHerb.srotas || [],
    avayava: backendHerb.avayava || [],
    regionalNames: backendHerb.regional_names || [],
    
    // Objects
    virya: backendHerb.virya,
    vipaka: backendHerb.vipaka,
    
    // Dosha: convert array of {dosha, effect} to object
    dosha: adaptDosha(backendHerb.dosha_actions || []),
    
    // Mala: convert array of {mala, effect} to array of strings with effect
    mala: adaptMala(backendHerb.mala || []),
    
    // Raw text
    rawKarma: backendHerb.raw_karma,
    rawIndication: backendHerb.raw_indication,
    
    // Search match
    match: backendHerb.match_percentage ?? backendHerb.matchPercentage,
    matchPercentage: backendHerb.matchPercentage ?? backendHerb.match_percentage,
    breakdown: backendHerb.breakdown,
  };
}

/**
 * Convert dosha_actions array to dosha object
 * Input: [{dosha: 'vata', effect: 'pacifies'}, ...]
 * Output: { vata: 'pacifies', pitta: 'increases', ... }
 */
function adaptDosha(doshaActions) {
  const dosha = {};
  doshaActions.forEach(action => {
    dosha[action.dosha] = action.effect;
  });
  return dosha;
}

/**
 * Convert mala array to formatted strings
 * Input: [{mala: 'Purisha', effect: 'decreases'}, ...]
 * Output: ['Purisha · decreases', 'Mutra · increases', ...]
 */
function adaptMala(malaArray) {
  return malaArray.map(m => `${m.mala} · ${m.effect}`);
}

/**
 * Convert frontend dosha object to backend array
 * Input: { vata: 'pacifies', pitta: 'increases' }
 * Output: [{dosha: 'vata', effect: 'pacifies'}, {dosha: 'pitta', effect: 'increases'}]
 */
function convertDoshaToBackend(doshaObj) {
  if (!doshaObj || typeof doshaObj !== 'object') {
    return [];
  }
  return Object.entries(doshaObj)
    .filter(([, effect]) => effect)
      .map(([dosha, effect]) => ({
        dosha: dosha.toLowerCase(),
        effect: ['decreases', 'decrease'].includes(String(effect).toLowerCase())
          ? 'pacifies'
          : String(effect).toLowerCase(),
      }))
      .filter(({ effect }) => ['pacifies', 'increases'].includes(effect));
}

/**
 * Convert frontend mala strings to backend array
 * Input: ['Purisha · decreases', 'Mutra · increases']
 * Output: [{mala: 'Purisha', effect: 'decreases'}, {mala: 'Mutra', effect: 'increases'}]
 */
function convertMalaToBackend(mala) {
  const normalizeEffect = (value) => {
    const effect = String(value || '').trim().toLowerCase();
    if (effect === 'decreases' || effect === 'decrease') return 'decreases';
    if (effect === 'increases' || effect === 'increase') return 'increases';
    return null;
  };
  if (Array.isArray(mala)) {
    return mala
      .map((item) => {
        if (item && typeof item === 'object' && item.term && item.effect) {
          const effect = normalizeEffect(item.effect);
          return effect ? { term: item.term, effect } : null;
        }
        if (typeof item !== 'string') {
          return null;
        }
        const [term, effect] = item.split('·').map((s) => s.trim());
        const normalizedEffect = normalizeEffect(effect);
        return term && normalizedEffect ? { term, effect: normalizedEffect } : null;
      })
      .filter(Boolean);
  }
  if (mala && typeof mala === 'object') {
    return Object.entries(mala)
      .filter(([, effect]) => effect)
      .map(([term, effect]) => {
        const normalizedEffect = normalizeEffect(effect);
        return normalizedEffect ? { term, effect: normalizedEffect } : null;
      })
      .filter(Boolean);
  }
  return [];
}

function convertDhatuToBackend(dhatu) {
  if (Array.isArray(dhatu)) {
    return dhatu;
  }
  if (dhatu && typeof dhatu === 'object') {
    return Object.entries(dhatu)
      .filter(([, score]) => score !== '' && score != null)
      .map(([term, score]) => ({ term, score: Number(score) }));
  }
  return [];
}

function convertDoshaPayload(herbData) {
  if (Array.isArray(herbData.dosha_actions)) {
    return herbData.dosha_actions;
  }
  return convertDoshaToBackend(herbData.dosha);
}

/**
 * List herbs with pagination and status filter
 */
export async function listHerbs(params = {}) {
  const { page = 1, limit = 20, status } = params;
  const queryParams = new URLSearchParams();
  if (page) queryParams.set('page', page);
  if (limit) queryParams.set('limit', limit);
  if (status) queryParams.set('status', status);
  
  const response = await apiClient.get(`/api/herbs?${queryParams}`);
  
  return {
    data: response.data.map(adaptHerb),
    pagination: response.pagination,
  };
}

export async function listAllHerbs({ status, limit = 200 } = {}) {
  const herbs = []
  let page = 1
  let totalPages
  do {
    const result = await listHerbs({ page, limit, status })
    herbs.push(...result.data)
    totalPages = result.pagination?.totalPages || page
    page += 1
  } while (page <= totalPages)
  return herbs
}

/**
 * Get herb by ID
 */
export async function getHerb(id, lang = 'en-IN') {
  const queryParams = new URLSearchParams();
  if (lang) queryParams.set('lang', lang);
  
  const response = await apiClient.get(`/api/herbs/${id}?${queryParams}`);
  return adaptHerb(response);
}

/**
 * Create herb (editor+ only)
 */
export async function createHerb(herbData) {
  const backendData = {
    ...herbData,
    dosha_actions: convertDoshaPayload(herbData),
    mala: convertMalaToBackend(herbData.mala),
    dhatu: convertDhatuToBackend(herbData.dhatu),
  };
  delete backendData.dosha;

  const response = await apiClient.post('/api/herbs', backendData);
  return adaptHerb(response);
}

/**
 * Update herb (editor+ only)
 */
export async function updateHerb(id, herbData) {
  const backendData = {
    ...herbData,
    dosha_actions: convertDoshaPayload(herbData),
    mala: convertMalaToBackend(herbData.mala),
    dhatu: convertDhatuToBackend(herbData.dhatu),
  };
  delete backendData.dosha;

  const response = await apiClient.put(`/api/herbs/${id}`, backendData);
  return adaptHerb(response);
}

/**
 * Verify herb (domain_expert+ only)
 */
export async function verifyHerb(id) {
  const response = await apiClient.post(`/api/herbs/${id}/verify`);
  return adaptHerb(response);
}

/**
 * Delete herb (admin only, soft delete)
 */
export async function deleteHerb(id) {
  const response = await apiClient.delete(`/api/herbs/${id}`);
  return adaptHerb(response);
}

export async function uploadHerbImage(id, file) {
  return apiClient.postBinary(`/api/upload/herb-image/${encodeURIComponent(id)}`, file);
}

/**
 * Detailed search
 */
export async function searchHerbs(filters, options = {}) {
  const { lang = 'en-IN', limit = 50, offset = 0 } = options;
  
  const response = await apiClient.post('/api/search/detailed', {
    filters,
    lang,
    limit,
    offset,
  });
  
  return {
    results: response.results.map(adaptHerb),
    meta: response.meta,
  };
}

/**
 * Detailed search (alias for searchHerbs, returns results array directly)
 */
export async function searchHerbsDetailed(filters, limit = 50) {
  const response = await apiClient.post('/api/search/detailed', {
    filters,
    limit,
  });
  
  return response.results.map(adaptHerb);
}

export async function searchHerbsSimple(query, limit = 50, filters = {}, options = {}) {
  const body = { ...(query?.trim() ? { query: query.trim() } : {}), limit };
  if (options.lang) body.lang = options.lang;
  if (Object.values(filters).some((value) => Array.isArray(value) && value.length > 0)) {
    body.filters = filters;
  }
  const response = await apiClient.post('/api/search/simple', body);
  return {
    results: response.results.map(adaptHerb),
    matchedTerms: response.matched_terms || [],
    unmatchedTokens: response.unmatched_tokens || [],
    language: response.lang || response.meta?.language || 'en-IN',
    note: response.note || '',
  };
}

/**
 * Get herb by ID (alias for getHerb with simpler signature)
 */
export async function getHerbById(id, language = localStorage.getItem('dravyaguna-language') || 'en-IN') {
  const lang = language;
  const response = await apiClient.get(`/api/herbs/${id}?lang=${encodeURIComponent(lang)}`);
  return adaptHerb(response);
}
