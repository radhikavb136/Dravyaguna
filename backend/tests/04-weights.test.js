import { assert, assertEqual } from './lib/assert.js';
import { api, countFullMatches } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const original = await api('GET', '/api/scoring/weights', { token: tokens.admin });
  assert(original.ok, 'get weights');
  const snapshot = { ...original.data.weights };

  try {
    const rasa = snapshot.rasa;
    const virya = snapshot.virya;
    const expected0010 = Math.round((rasa / (rasa + virya)) * 100);
    const expected0023 = Math.round((virya / (rasa + virya)) * 100);

    const search = await api('POST', '/api/search/detailed', {
      token: tokens.clinician,
      body: { filters: { rasa: ['tikta'], virya: ['ushna'] }, limit: 200 },
    });
    const rec0010 = search.data.results.find((row) => row.code === 'HERB_REC_0010');
    const rec0023 = search.data.results.find((row) => row.code === 'HERB_REC_0023');
    assert(rec0010, 'HERB_REC_0010 in Tikta+Ushna results');
    assert(rec0023, 'HERB_REC_0023 in Tikta+Ushna results');
    assertEqual(Math.round(rec0010.matchPercentage), expected0010, 'HERB_REC_0010 percent');
    assertEqual(Math.round(rec0023.matchPercentage), expected0023, 'HERB_REC_0023 percent');
    const baselineFullMatches = countFullMatches(search.data.results);

    const updated = await api('PUT', '/api/scoring/weights', {
      token: tokens.admin,
      body: { parameter_group: 'rasa', weight: rasa + 10 },
    });
    assert(updated.ok, 'update rasa weight');
    assertEqual(updated.data.weights.rasa, rasa + 10, 'rasa after update');

    const bulk = await api('PUT', '/api/scoring/weights/bulk', {
      token: tokens.admin,
      body: { weights: { rasa: rasa + 5, virya: virya + 2 } },
    });
    assert(bulk.ok, 'bulk update weights');
    assertEqual(bulk.data.weights.rasa, rasa + 5, 'bulk rasa update');
    assertEqual(bulk.data.weights.virya, virya + 2, 'bulk virya update');

    const invalidBulk = await api('PUT', '/api/scoring/weights/bulk', {
      token: tokens.admin,
      body: { weights: { rasa: 1, unknown_group: 2 } },
    });
    assertEqual(invalidBulk.status, 400, 'unknown bulk parameter rejected');
    const afterInvalidBulk = await api('GET', '/api/scoring/weights', { token: tokens.admin });
    assertEqual(afterInvalidBulk.data.weights.rasa, rasa + 5, 'invalid bulk request leaves persisted weights unchanged');

    const again = await api('POST', '/api/search/detailed', {
      token: tokens.clinician,
      body: { filters: { rasa: ['tikta'], virya: ['ushna'] }, limit: 200 },
    });
    const rec0010b = again.data.results.find((row) => row.code === 'HERB_REC_0010');
    assert(rec0010b.matchPercentage !== rec0010.matchPercentage, 'next search reflects new weight');
    assertEqual(countFullMatches(again.data.results), baselineFullMatches, '100% count unchanged by weight');
  } finally {
    for (const [parameter_group, weight] of Object.entries(snapshot)) {
      await api('PUT', '/api/scoring/weights', {
        token: tokens.admin,
        body: { parameter_group, weight },
      });
    }
  }

  const clinicianPut = await api('PUT', '/api/scoring/weights', {
    token: tokens.clinician,
    body: { parameter_group: 'rasa', weight: 20 },
  });
  assertEqual(clinicianPut.status, 403, 'clinician cannot update weights');
  const clinicianBulk = await api('PUT', '/api/scoring/weights/bulk', {
    token: tokens.clinician,
    body: { weights: { rasa: 20 } },
  });
  assertEqual(clinicianBulk.status, 403, 'clinician cannot update bulk weights');

  try {
    const expertUpdate = await api('PUT', '/api/scoring/weights', {
      token: tokens.expert,
      body: { parameter_group: 'rasa', weight: snapshot.rasa + 1 },
    });
    assertEqual(expertUpdate.status, 200, 'domain expert can update scoring weights');
    assertEqual(expertUpdate.data.weights.rasa, snapshot.rasa + 1, 'expert update is persisted');
  } finally {
    const restoreExpertUpdate = await api('PUT', '/api/scoring/weights', {
      token: tokens.admin,
      body: { parameter_group: 'rasa', weight: snapshot.rasa },
    });
    assertEqual(restoreExpertUpdate.status, 200, 'restore original scoring weight');
  }
}
