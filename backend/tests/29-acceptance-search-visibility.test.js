/**
 * Phase 1 acceptance: clinician search visibility for Tikta + Deepana at 100% match.
 * Deterministic on any DB size: baseline → +0 (draft) → +1 (reviewed) → +1 (verified) → baseline (archive).
 * Optional fixed baseline when ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55 (approved dev dataset).
 */
import pg from 'pg';
import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { devPassword, getTokens } from './lib/session.js';

const FILTERS = { rasa: ['Tikta'], karma: ['Deepana'] };

function countPerfectMatches(results) {
  return (results || []).filter((row) => row.matchPercentage === 100).length;
}

async function detailedSearch(token) {
  const result = await api('POST', '/api/search/detailed', {
    token,
    body: { filters: FILTERS, limit: 200 },
  });
  assertEqual(result.status, 200, 'detailed search');
  return result.data.results || [];
}

export async function run() {
  const stamp = Date.now();
  const code = `ACCEPTANCE_TEST_${stamp}`;
  const { tokens } = await getTokens();
  const clinicianToken = tokens.clinician;
  const editorToken = tokens.editor;
  const expertToken = tokens.expert;
  const adminToken = tokens.admin;

  const baselineResults = await detailedSearch(clinicianToken);
  const baselineCount = countPerfectMatches(baselineResults);
  const expectedFixed = process.env.ACCEPTANCE_BASELINE_TIKTA_DEEPANA;
  if (expectedFixed !== undefined && expectedFixed !== '') {
    assertEqual(
      baselineCount,
      Number(expectedFixed),
      `fixed baseline Tikta+Deepana 100% matches (ACCEPTANCE_BASELINE_TIKTA_DEEPANA)`,
    );
  }

  const create = await api('POST', '/api/herbs', {
    token: editorToken,
    body: {
      code,
      english_name: `Acceptance Test Herb ${stamp}`,
      sanskrit_name: 'Test Sanskrit',
      rasa: ['Tikta'],
      karma: ['Deepana'],
      status: 'draft',
    },
  });
  assertEqual(create.status, 201, 'create acceptance herb');
  const herbId = create.data.id;

  const afterDraft = countPerfectMatches(await detailedSearch(clinicianToken));
  assertEqual(afterDraft, baselineCount, 'draft herb invisible to clinician at 100%');

  const review = await api('PUT', `/api/herbs/${herbId}`, {
    token: editorToken,
    body: { status: 'reviewed' },
  });
  assertEqual(review.status, 200, 'move herb to reviewed');
  const afterReviewed = countPerfectMatches(await detailedSearch(clinicianToken));
  assertEqual(afterReviewed, baselineCount + 1, 'reviewed herb visible at 100%');

  const verify = await api('POST', `/api/herbs/${herbId}/verify`, { token: expertToken, body: {} });
  assertEqual(verify.status, 200, 'verify herb');
  const afterVerified = countPerfectMatches(await detailedSearch(clinicianToken));
  assertEqual(afterVerified, baselineCount + 1, 'verified herb still visible at 100%');

  const archive = await api('DELETE', `/api/herbs/${herbId}`, { token: adminToken });
  assertEqual(archive.status, 200, 'archive acceptance herb');
  const afterArchive = countPerfectMatches(await detailedSearch(clinicianToken));
  assertEqual(afterArchive, baselineCount, 'archived herb removed from clinician 100% set');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const { rowCount } = await pool.query('DELETE FROM herbs WHERE code = $1', [code]);
    assert(rowCount <= 1, 'acceptance cleanup');
  } finally {
    await pool.end();
  }
}
