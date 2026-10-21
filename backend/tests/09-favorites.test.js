import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const list = await api('GET', '/api/herbs?page=1&limit=1', { token: tokens.clinician });
  const herbId = list.data.data[0].id;

  await api('DELETE', `/api/favorites/${herbId}`, { token: tokens.clinician });

  const added = await api('POST', '/api/favorites', {
    token: tokens.clinician,
    body: { herb_id: herbId },
  });
  assert(added.ok || added.status === 409, `add favorite (${added.status})`);

  const favorites = await api('GET', '/api/favorites', { token: tokens.clinician });
  assert(favorites.ok, 'list favorites');
  assert(
    (favorites.data.data || []).some((row) => row.herb_id === herbId),
    'favorite present'
  );

  const removed = await api('DELETE', `/api/favorites/${herbId}`, {
    token: tokens.clinician,
  });
  assert(removed.ok, 'remove favorite');

  const invalidFavorite = await api('POST', '/api/favorites', {
    token: tokens.clinician,
    body: { herb_id: 'not-a-uuid' },
  });
  assertEqual(invalidFavorite.status, 400, 'invalid favorite id is rejected');

  const saved = await api('POST', '/api/saved-searches', {
    token: tokens.clinician,
    body: { name: `zz_test_search_${Date.now()}`, filters: { rasa: ['tikta'] } },
  });
  assert(saved.ok, 'save search');
  const searchId = saved.data.id;

  const listed = await api('GET', '/api/saved-searches', { token: tokens.clinician });
  assert(
    (listed.data.data || []).some((row) => row.id === searchId),
    'saved search listed'
  );

  const deleted = await api('DELETE', `/api/saved-searches/${searchId}`, {
    token: tokens.clinician,
  });
  assert(deleted.ok, 'delete saved search');
  assertEqual(typeof deleted.data.message, 'string', 'delete message');

  const invalidSearch = await api('POST', '/api/saved-searches', {
    token: tokens.clinician,
    body: { name: '   ', filters: {} },
  });
  assertEqual(invalidSearch.status, 400, 'blank saved search name is rejected');
}
