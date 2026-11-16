import { assert } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

async function simpleSearch(query, token) {
  const res = await api('POST', '/api/search/simple', {
    token,
    body: { query, limit: 20 },
  });
  assert(res.ok, `simple search "${query}" (${res.status})`);
  return res.data.results || [];
}

export async function run() {
  const { tokens } = await getTokens();

  const sleepResults = await simpleSearch('difficulty sleeping', tokens.clinician);
  assert(
    sleepResults.length === 0 || sleepResults.every((r) => r.englishName),
    'results must not use unnamed herbs when names exist'
  );

  const coughResults = await simpleSearch('cough', tokens.clinician);
  assert(coughResults.length > 0, 'cough should match kasa-related indications in the dataset');

  const digestiveResults = await simpleSearch('digestive pain', tokens.clinician);
  assert(digestiveResults.length > 0, 'digestive pain should match pachana/deepana or related vocabulary');

  const top = coughResults[0] || digestiveResults[0];
  if (top) {
    assert(
      top.breakdown?.length > 0 || top.matchPercentage > 0,
      'results expose relevance scoring metadata'
    );
  }
}
