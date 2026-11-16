import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

const pool = getTestPool();

export async function run() {
  const { tokens, users } = await getTokens();
  const stamp = Date.now();
  const approveText = `zz_test${stamp}a`;
  const rejectText = `zz_test${stamp}b`;
  let approveId;
  let rejectId;

  const karma = await pool.query(
    `SELECT id FROM karma_terms WHERE lower(canonical_en) = 'deepana' LIMIT 1`
  );
  assert(karma.rows[0], 'fixture karma term Deepana');

  try {
    const insertedApprove = await pool.query(
      `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
       VALUES ('karma', $1, 'en-IN', $2, 'draft') RETURNING id`,
      [karma.rows[0].id, approveText]
    );
    approveId = insertedApprove.rows[0].id;

    const insertedReject = await pool.query(
      `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
       VALUES ('karma', $1, 'en-IN', $2, 'draft') RETURNING id`,
      [karma.rows[0].id, rejectText]
    );
    rejectId = insertedReject.rows[0].id;

    const clinicianList = await api('GET', '/api/vocabulary/synonyms/review?status=draft', {
      token: tokens.clinician,
    });
    assertEqual(clinicianList.status, 403, 'clinician cannot list synonym reviews');

    const editorList = await api('GET', '/api/vocabulary/synonyms/review?status=draft', {
      token: tokens.editor,
    });
    assertEqual(editorList.status, 403, 'editor cannot list synonym reviews');

    const expertList = await api('GET', '/api/vocabulary/synonyms/review?status=draft&limit=5', {
      token: tokens.expert,
    });
    assertEqual(expertList.status, 200, 'domain expert can list pending mappings');
    assert(Array.isArray(expertList.data.items), 'list returns items array');
    assert(expertList.data.items.some((row) => row.id === approveId), 'pending list includes test approve row');

    const detail = await api('GET', `/api/vocabulary/synonyms/review/${approveId}`, {
      token: tokens.admin,
    });
    assertEqual(detail.status, 200, 'admin can read mapping detail');
    assertEqual(detail.data.text, approveText, 'detail text');
    assertEqual(detail.data.canonical_en, 'Deepana', 'detail includes canonical context');

    const invalidId = await api('POST', '/api/vocabulary/synonyms/review/999999999/approve', {
      token: tokens.admin,
    });
    assertEqual(invalidId.status, 404, 'unknown id returns 404');

    const approved = await api('POST', `/api/vocabulary/synonyms/review/${approveId}/approve`, {
      token: tokens.expert,
    });
    assertEqual(approved.status, 200, 'expert can approve mapping');
    assertEqual(approved.data.approval_status, 'approved', 'approve sets status');
    assert(approved.data.reviewed_at, 'approve sets reviewed_at');
    assertEqual(approved.data.reviewed_by, users.expert.id, 'approve records reviewer');

    const duplicateApprove = await api('POST', `/api/vocabulary/synonyms/review/${approveId}/approve`, {
      token: tokens.admin,
    });
    assertEqual(duplicateApprove.status, 409, 'duplicate approve is rejected');

    const searchAfterApprove = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: approveText, limit: 10 },
    });
    assertEqual(searchAfterApprove.status, 200, 'search after approve');
    assert(
      searchAfterApprove.data.matched_terms.some((term) => term.matchType === 'approved_synonym'),
      'approved synonym is searchable'
    );

    const rejected = await api('POST', `/api/vocabulary/synonyms/review/${rejectId}/reject`, {
      token: tokens.admin,
      body: { reason: 'zz_test not a valid clinical synonym' },
    });
    assertEqual(rejected.status, 200, 'admin can reject mapping');
    assertEqual(rejected.data.approval_status, 'rejected', 'reject sets status');
    assertEqual(rejected.data.rejection_reason, 'zz_test not a valid clinical synonym', 'reject stores reason');

    const auditApprove = await pool.query(
      `SELECT action FROM audit_log WHERE entity_type = 'term_synonym' AND entity_id = $1 ORDER BY created_at DESC`,
      [String(approveId)]
    );
    assert(auditApprove.rows.some((row) => row.action === 'approve_synonym'), 'approve audit row');

    const auditReject = await pool.query(
      `SELECT action FROM audit_log WHERE entity_type = 'term_synonym' AND entity_id = $1 ORDER BY created_at DESC`,
      [String(rejectId)]
    );
    assert(auditReject.rows.some((row) => row.action === 'reject_synonym'), 'reject audit row');

    const filters = await api('GET', '/api/vocabulary/filters', { token: tokens.clinician });
    assertEqual(filters.status, 200, 'vocabulary filters still work');
  } finally {
    if (approveId) {
      await pool.query(`DELETE FROM audit_log WHERE entity_type = 'term_synonym' AND entity_id = $1`, [String(approveId)]);
      await pool.query('DELETE FROM term_synonyms WHERE id = $1', [approveId]);
    }
    if (rejectId) {
      await pool.query(`DELETE FROM audit_log WHERE entity_type = 'term_synonym' AND entity_id = $1`, [String(rejectId)]);
      await pool.query('DELETE FROM term_synonyms WHERE id = $1', [rejectId]);
    }
  }
}
