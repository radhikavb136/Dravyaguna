import { apiClient } from './client.js';

export function verifyTranslation({ contentId, fieldName, language }) {
  return apiClient.post('/api/translations/verify', {
    content_type: 'herb',
    content_id: String(contentId),
    field_name: fieldName,
    language,
  });
}
