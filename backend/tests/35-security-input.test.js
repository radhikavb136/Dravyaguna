import { assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const injectionQuery = `'; DROP TABLE herbs; --`;
  const simple = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: injectionQuery, limit: 5 },
  });
  assertEqual(simple.status, 200, 'simple search handles malicious string without server error');
  assertEqual(Array.isArray(simple.data.results), true, 'simple search still returns a results array');

  const detailed = await api('POST', '/api/search/detailed', {
    token: tokens.clinician,
    body: {
      filters: { prabhava: [injectionQuery] },
      limit: 5,
    },
  });
  assertEqual(detailed.status, 200, 'detailed search handles malicious filter text');
  assertEqual(Array.isArray(detailed.data.results), true, 'detailed search returns results array');

  const herbs = await api('GET', `/api/herbs?q=${encodeURIComponent(injectionQuery)}&page=1&limit=5`, {
    token: tokens.clinician,
  });
  assertEqual(herbs.status, 200, 'herb list q parameter is parameterized');
}
