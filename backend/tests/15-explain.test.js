import pg from 'pg';
import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { canonicalFiltersHash, generateExplanation } from '../src/services/explain/explainService.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

export async function run() {
  const { tokens } = await getTokens();
  const { rows: [fixture] } = await pool.query(`
    SELECT h.id, rt.slug AS rasa_slug
    FROM herbs h
    JOIN herb_rasa hr ON hr.herb_id = h.id
    JOIN rasa_terms rt ON rt.id = hr.rasa_id
    WHERE h.status IN ('reviewed', 'verified')
    ORDER BY h.code
    LIMIT 1
  `);
  assert(fixture, 'explain tests require a reviewed herb with Rasa data');

  const stamp = Date.now();
  const filters = { rasa: [fixture.rasa_slug], prabhava: [`zz_test_explain_${stamp}`] };
  const failedFilters = { prabhava: [`zz_test_explain_failure_${stamp}`] };
  const rateFilters = { prabhava: [`zz_test_explain_rate_${stamp}`] };
  const invalidationFilters = { prabhava: [`zz_test_explain_invalidate_${stamp}`] };
  const cleanupHashes = [filters, failedFilters, rateFilters, invalidationFilters].map(canonicalFiltersHash);
  let temporaryHerbId;
  const provider = {
    name: 'test-mock',
    model: 'fixture',
    calls: 0,
    async generate({ system, retrievedData }) {
      this.calls += 1;
      assert(system.includes('Do not give dosages'), 'grounded prompt prohibits dosages');
      assert(retrievedData.herb.id === fixture.id, 'provider receives only the retrieved herb');
      assert(Array.isArray(retrievedData.scoring.breakdown), 'provider receives server-computed scoring');
      assert(!Object.hasOwn(retrievedData, 'prompt'), 'client prompt is not included in retrieved JSON');
      return 'Grounded test explanation.';
    },
  };

  try {
    const first = await generateExplanation({ herbId: fixture.id, filters, lang: 'en-IN', role: 'clinician' }, { provider });
    assertEqual(first.ai_generated, true, 'mock provider returns generated response');
    assertEqual(first.cache_hit, false, 'first explanation misses cache');
    assert(first.structured.breakdown.length > 0, 'structured breakdown remains available');
    const second = await generateExplanation({ herbId: fixture.id, filters, lang: 'en-IN', role: 'clinician' }, { provider });
    assertEqual(second.cache_hit, true, 'second explanation is cached');
    assertEqual(provider.calls, 1, 'cache hit makes zero additional provider calls');

    const temporaryHerb = await api('POST', '/api/herbs', {
      token: tokens.editor,
      body: { code: `zz_test_explain_${stamp}`, english_name: `ZZ Test Explain ${stamp}` },
    });
    assertEqual(temporaryHerb.status, 201, 'editor creates a temporary draft for cache invalidation');
    temporaryHerbId = temporaryHerb.data.id;
    const invalidationProvider = {
      name: 'invalidation-test',
      model: 'fixture',
      async generate() { return 'Temporary grounded test explanation.'; },
    };
    await generateExplanation(
      { herbId: temporaryHerbId, filters: invalidationFilters, lang: 'en-IN', role: 'editor' },
      { provider: invalidationProvider }
    );
    const cachedBeforeEdit = await pool.query(
      `SELECT count(*)::int AS count FROM rag_explanation_cache WHERE herb_id = $1`,
      [temporaryHerbId]
    );
    assert(cachedBeforeEdit.rows[0].count > 0, 'explanation is cached for the temporary herb');
    const edited = await api('PUT', `/api/herbs/${temporaryHerbId}`, {
      token: tokens.editor,
      body: { description: 'Temporary test edit.' },
    });
    assertEqual(edited.status, 200, 'editor updates the temporary herb');
    const cachedAfterEdit = await pool.query(
      `SELECT count(*)::int AS count FROM rag_explanation_cache WHERE herb_id = $1`,
      [temporaryHerbId]
    );
    assertEqual(cachedAfterEdit.rows[0].count, 0, 'herb edit invalidates its explanation cache');

    const failed = await generateExplanation(
      { herbId: fixture.id, filters: failedFilters, lang: 'en-IN', role: 'clinician' },
      { provider: { name: 'failing-test', model: 'fixture', async generate() { throw new Error('provider failure'); } } }
    );
    assertEqual(failed.explanation_unavailable, true, 'provider failure degrades gracefully');
    assert(Array.isArray(failed.structured.breakdown), 'provider failure still returns structured score');
    assertEqual(failed.ai_generated, false, 'failed provider is not presented as generated text');

    const unauthenticated = await api('POST', '/api/explain', {
      body: { herb_id: fixture.id },
    });
    assertEqual(unauthenticated.status, 401, 'explain requires authentication');

    const invalid = await api('POST', '/api/explain', {
      token: tokens.clinician,
      body: { herb_id: 'not-a-uuid' },
    });
    assertEqual(invalid.status, 400, 'explain validates herb identifiers');

    const valid = await api('POST', '/api/explain', {
      token: tokens.clinician,
      body: { herb_id: fixture.id, filters: rateFilters },
    });
    assertEqual(valid.status, 200, 'authenticated clinician can request explanation');
    assertEqual(valid.data.provider, 'mock', 'default provider is mock');
    assert(Array.isArray(valid.data.citations), 'response includes reference citations');

    // The 10/minute cap is per authenticated user; invalid authenticated calls count too.
    for (let i = 0; i < 8; i += 1) {
      const request = await api('POST', '/api/explain', {
        token: tokens.clinician,
        body: { herb_id: fixture.id, filters: rateFilters },
      });
      assertEqual(request.status, 200, `explanation request ${i + 2} is within the limit`);
    }
    const limited = await api('POST', '/api/explain', {
      token: tokens.clinician,
      body: { herb_id: fixture.id, filters: rateFilters },
    });
    assertEqual(limited.status, 429, 'per-user explanation rate limit is enforced');
  } finally {
    await pool.query(`DELETE FROM rag_explanation_cache WHERE herb_id = $1 AND filters_hash = ANY($2::text[])`, [fixture.id, cleanupHashes]);
    if (temporaryHerbId) {
      await pool.query('DELETE FROM audit_log WHERE entity_type = $1 AND entity_id = $2', ['herb', temporaryHerbId]);
      await pool.query('DELETE FROM herbs WHERE id = $1', [temporaryHerbId]);
    }
    await pool.end();
  }
}
