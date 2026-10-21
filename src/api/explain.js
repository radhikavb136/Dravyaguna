import { apiClient } from './client.js'

export function explainHerb({ herbId, filters = {}, lang = 'en-IN' }) {
  return apiClient.post('/api/explain', {
    herb_id: herbId,
    filters,
    lang,
  })
}
