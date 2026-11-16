import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

const pool = getTestPool();

export async function run() {
  const { tokens } = await getTokens();
  const stamp = Date.now();
  const synonym = `zz_test${stamp}`;
  let synonymId;

  try {
    const karma = await pool.query(
      `SELECT id FROM karma_terms WHERE lower(canonical_en) = 'deepana' LIMIT 1`
    );
    assert(karma.rows[0], 'test fixture requires the existing Deepana vocabulary term');
    const inserted = await pool.query(
      `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
       VALUES ('karma', $1, 'en-IN', $2, 'draft') RETURNING id`,
      [karma.rows[0].id, synonym]
    );
    synonymId = inserted.rows[0].id;

    const draft = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: synonym },
    });
    assertEqual(draft.data.results.length, 0, 'draft synonym is not mapped');
    assertEqual(draft.data.matched_terms.length, 0, 'draft synonym is not reported as a match');

    await pool.query(`UPDATE term_synonyms SET approval_status = 'approved' WHERE id = $1`, [synonymId]);
    const exact = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: synonym, limit: 20 },
    });
    assertEqual(exact.status, 200, 'approved synonym search status');
    assert(exact.data.matched_terms.some((term) => term.matchType === 'approved_synonym'), `approved synonym is reported: ${JSON.stringify(exact.data.matched_terms)}`);
    assertEqual(exact.data.matched_terms[0].canonical, 'Deepana', 'approved synonym maps to existing canonical term');
    assert(exact.data.results.length > 0, 'approved synonym uses the scoring engine');

    const unknownQuery = `zzqqqxvzzunmapped${stamp}`;
    const beforeUnknown = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: unknownQuery },
    });
    assertEqual(beforeUnknown.status, 200, 'unknown phrase is handled');
    assertEqual(beforeUnknown.data.results.length, 0, 'unknown phrase returns no herbs');
    assert(beforeUnknown.data.unmatched_tokens.length > 0, 'unknown phrase reports unmatched tokens');
    await waitForSearchEvent(unknownQuery);

    const beforeFuzzy = await pool.query(
      `SELECT count(*)::int AS count FROM term_synonyms WHERE lower(text) = 'deepanaa'`
    );
    const fuzzy = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: 'deepanaa', limit: 20 },
    });
    assertEqual(fuzzy.status, 200, 'fuzzy query is handled');
    assert(fuzzy.data.matched_terms.some((term) => term.matchType === 'fuzzy'), 'fuzzy match is labeled as request-only');
    const afterFuzzy = await pool.query(
      `SELECT count(*)::int AS count FROM term_synonyms WHERE lower(text) = 'deepanaa'`
    );
    assertEqual(afterFuzzy.rows[0].count, beforeFuzzy.rows[0].count, 'fuzzy matching never writes or approves a synonym');

    const unsupported = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: 'औषधि' },
    });
    assertEqual(unsupported.status, 200, 'unsupported language degrades to a response');
    assert(unsupported.data.note?.includes('not interpreted'), 'untranslated query is clearly reported as not interpreted');
  } finally {
    if (synonymId) await pool.query('DELETE FROM term_synonyms WHERE id = $1', [synonymId]);
  }
}

async function waitForSearchEvent(query) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { rows } = await pool.query(
      `SELECT id FROM search_events WHERE mode = 'simple' AND query_text = $1 LIMIT 1`,
      [query]
    );
    if (rows.length) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('unknown simple-search event was not logged');
}
