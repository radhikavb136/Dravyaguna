/**
 * Favorites and Saved Searches API
 */

import { apiClient } from './client.js';

export async function getFavorites() {
  return apiClient.get('/api/favorites');
}

export async function addFavorite(herbId) {
  return apiClient.post('/api/favorites', { herb_id: herbId });
}

export async function removeFavorite(herbId) {
  return apiClient.delete(`/api/favorites/${herbId}`);
}

export async function getSavedSearches() {
  return apiClient.get('/api/saved-searches');
}

export async function saveSearch(name, filters) {
  return apiClient.post('/api/saved-searches', { name, filters });
}

export async function removeSavedSearch(id) {
  return apiClient.delete(`/api/saved-searches/${id}`);
}
