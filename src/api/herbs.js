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
    englishName: backendHerb.english_name,
    botanicalName: backendHerb.botanical_name,
    sanskritName: backendHerb.sanskrit_name,
    localName: backendHerb.local_name,
    family: backendHerb.family,
    partUsed: backendHerb.part_used,
    prabhava: backendHerb.prabhava,
    imageUrl: backendHerb.image_url,
    status: backendHerb.status,
    verificationStatus: backendHerb.status,
    
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
    match: backendHerb.match_percentage,
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
    .filter(([_, effect]) => effect)
    .map(([dosha, effect]) => ({ dosha, effect }));
}

/**
 * Convert frontend mala strings to backend array
 * Input: ['Purisha · decreases', 'Mutra · increases']
 * Output: [{mala: 'Purisha', effect: 'decreases'}, {mala: 'Mutra', effect: 'increases'}]
 */
function convertMalaToBackend(malaStrings) {
  if (!Array.isArray(malaStrings)) {
    return [];
  }
  return malaStrings
    .map(str => {
      const [mala, effect] = str.split('·').map(s => s.trim());
      return { mala, effect };
    })
    .filter(item => item.mala && item.effect);
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
    dosha_actions: convertDoshaToBackend(herbData.dosha),
    mala: convertMalaToBackend(herbData.mala),
  };
  
  const response = await apiClient.post('/api/herbs', backendData);
  return adaptHerb(response);
}

/**
 * Update herb (editor+ only)
 */
export async function updateHerb(id, herbData) {
  const backendData = {
    ...herbData,
    dosha_actions: convertDoshaToBackend(herbData.dosha),
    mala: convertMalaToBackend(herbData.mala),
  };
  
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

/**
 * Get herb by ID (alias for getHerb with simpler signature)
 */
export async function getHerbById(id) {
  const response = await apiClient.get(`/api/herbs/${id}`);
  return adaptHerb(response);
}
