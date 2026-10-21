import { apiClient } from './client.js'

export function explainHerb({ herbId, question, filters = {}, lang = 'en-IN' }) {
  return apiClient.post('/api/explain', {
    herb_id: herbId,
    question,
    filters,
    lang,
  })
}
