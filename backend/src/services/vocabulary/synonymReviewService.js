import { pool } from '../../db/pool.js';
import { logAudit } from '../audit/auditService.js';

const VOCABULARY_TABLES = {
  karma: 'karma_terms',
  karma_terms: 'karma_terms',
  indication: 'indication_terms',
  indication_terms: 'indication_terms',
};

function resolveVocabularyTable(vocabulary) {
  return VOCABULARY_TABLES[vocabulary] || null;
}

function mapRow(row) {
  return {
    id: row.id,
    vocabulary: row.vocabulary,
    term_id: row.term_id,
    language_code: row.language_code,
    text: row.text,
    approval_status: row.approval_status,
    created_at: row.created_at,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    rejection_reason: row.rejection_reason,
    canonical_en: row.canonical_en || null,
    canonical_slug: row.canonical_slug || null,
  };
}

export async function listSynonymReviews({
  status = 'draft',
  vocabulary = null,
  limit = 25,
  offset = 0,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const params = [status];
  let vocabularyFilter = '';
  if (vocabulary) {
    params.push(vocabulary);
    vocabularyFilter = `AND s.vocabulary = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT s.*,
            COALESCE(kt.canonical_en, it.canonical_en) AS canonical_en,
            COALESCE(kt.slug, it.slug) AS canonical_slug
     FROM term_synonyms s
     LEFT JOIN karma_terms kt ON s.vocabulary IN ('karma', 'karma_terms') AND kt.id = s.term_id
     LEFT JOIN indication_terms it ON s.vocabulary IN ('indication', 'indication_terms') AND it.id = s.term_id
     WHERE s.approval_status = $1
     ${vocabularyFilter}
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  const countParams = [status];
  let countVocabularyFilter = '';
  if (vocabulary) {
    countParams.push(vocabulary);
    countVocabularyFilter = `AND vocabulary = $${countParams.length}`;
  }
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM term_synonyms WHERE approval_status = $1 ${countVocabularyFilter}`,
    countParams
  );

  return {
    items: rows.map(mapRow),
    total: countRows[0]?.total || 0,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getSynonymReviewById(id) {
  const { rows } = await pool.query(
    `SELECT s.*,
            COALESCE(kt.canonical_en, it.canonical_en) AS canonical_en,
            COALESCE(kt.slug, it.slug) AS canonical_slug
     FROM term_synonyms s
     LEFT JOIN karma_terms kt ON s.vocabulary IN ('karma', 'karma_terms') AND kt.id = s.term_id
     LEFT JOIN indication_terms it ON s.vocabulary IN ('indication', 'indication_terms') AND it.id = s.term_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function decideSynonym({ id, userId, nextStatus, rejectionReason = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM term_synonyms WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const before = rows[0];
    if (!before) {
      await client.query('ROLLBACK');
      return { error: 'not_found' };
    }
    if (before.approval_status !== 'draft') {
      await client.query('ROLLBACK');
      return { error: 'conflict', current: before.approval_status };
    }
    const table = resolveVocabularyTable(before.vocabulary);
    if (!table) {
      await client.query('ROLLBACK');
      return { error: 'unsupported_vocabulary' };
    }
    const termCheck = await client.query(`SELECT id, canonical_en FROM ${table} WHERE id = $1`, [before.term_id]);
    if (!termCheck.rows[0]) {
      await client.query('ROLLBACK');
      return { error: 'missing_term' };
    }

    const { rows: updated } = await client.query(
      `UPDATE term_synonyms
       SET approval_status = $2,
           reviewed_by = $3,
           reviewed_at = NOW(),
           rejection_reason = $4
       WHERE id = $1 AND approval_status = 'draft'
       RETURNING *`,
      [id, nextStatus, userId, nextStatus === 'rejected' ? (rejectionReason || null) : null]
    );
    if (!updated[0]) {
      await client.query('ROLLBACK');
      return { error: 'conflict' };
    }

    const after = {
      ...updated[0],
      canonical_en: termCheck.rows[0].canonical_en,
    };
    await logAudit({
      userId,
      action: nextStatus === 'approved' ? 'approve_synonym' : 'reject_synonym',
      entityType: 'term_synonym',
      entityId: String(id),
      before,
      after,
      client,
    });
    await client.query('COMMIT');
    return { item: mapRow({ ...after, canonical_en: termCheck.rows[0].canonical_en, canonical_slug: null }) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function approveSynonym(id, userId) {
  return decideSynonym({ id, userId, nextStatus: 'approved' });
}

export async function rejectSynonym(id, userId, rejectionReason) {
  const reason = String(rejectionReason || '').trim().slice(0, 500) || null;
  return decideSynonym({ id, userId, nextStatus: 'rejected', rejectionReason: reason });
}

export async function proposeSynonym({ vocabulary, termId, languageCode, text, userId }) {
  const table = resolveVocabularyTable(vocabulary);
  if (!table) return { error: 'unsupported_vocabulary' };
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return { error: 'invalid_text' };

  const termCheck = await pool.query(`SELECT id, canonical_en FROM ${table} WHERE id = $1`, [termId]);
  if (!termCheck.rows[0]) return { error: 'missing_term' };

  const vocabKey = vocabulary === 'karma_terms' ? 'karma' : vocabulary === 'indication_terms' ? 'indication' : vocabulary;
  const lang = String(languageCode || 'en-IN').slice(0, 10);

  const duplicate = await pool.query(
    `SELECT id, approval_status FROM term_synonyms
     WHERE vocabulary IN ($1, $2) AND term_id = $3 AND lower(text) = lower($4)
     LIMIT 1`,
    [vocabKey, vocabulary, termId, normalizedText]
  );
  if (duplicate.rows[0]) {
    return { error: 'duplicate', existing: duplicate.rows[0] };
  }

  const { rows } = await pool.query(
    `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
     VALUES ($1, $2, $3, $4, 'draft')
     RETURNING *`,
    [vocabKey, termId, lang, normalizedText]
  );
  const item = mapRow({
    ...rows[0],
    canonical_en: termCheck.rows[0].canonical_en,
    canonical_slug: null,
  });
  await logAudit({
    userId,
    action: 'propose_synonym',
    entityType: 'term_synonym',
    entityId: String(rows[0].id),
    before: {},
    after: rows[0],
  });
  const { notifyUsersWithRoles } = await import('../notifications/notificationService.js');
  await notifyUsersWithRoles(['admin', 'domain_expert'], {
    kind: 'synonym_review',
    title: 'Synonym pending review',
    body: `"${normalizedText}" for ${termCheck.rows[0].canonical_en} (${vocabKey}) needs approval.`,
    linkPath: '/admin/synonym-review',
  });
  return { item };
}
