/**
 * Vocabulary API routes
 * Provides filter options for the frontend
 */

import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { logAudit } from '../services/audit/auditService.js';
import {
  approveSynonym,
  getSynonymReviewById,
  listSynonymReviews,
  rejectSynonym,
  proposeSynonym,
} from '../services/vocabulary/synonymReviewService.js';

const router = express.Router();
const synonymReviewRoles = requireRole('admin', 'domain_expert');

// Schema for creating custom terms
const createKarmaSchema = z.object({
  canonical_en: z.string().min(1),
});

const createIndicationSchema = z.object({
  canonical_en: z.string().min(1),
});

const termIdSchema = z.coerce.number().int().positive();
const updateTermSchema = z.object({
  canonical_en: z.string().min(1),
});
const mergeTermSchema = z.object({
  target_id: z.coerce.number().int().positive(),
});

const managedTerms = {
  karma: {
    table: 'karma_terms',
    junction: 'herb_karma',
    column: 'karma_id',
    vocabulary: 'karma',
  },
  indications: {
    table: 'indication_terms',
    junction: 'herb_indications',
    column: 'indication_id',
    vocabulary: 'indication',
  },
};

function getManagedTerms(category) {
  const terms = managedTerms[category];
  if (!terms) {
    const error = new Error('Only Karma and Indications terms can be managed here');
    error.statusCode = 400;
    throw error;
  }
  return terms;
}

// Get all vocabulary terms for filters
router.get('/filters', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get Rasa
      const formatTerms = (rows) =>
        rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          label: row.canonical_en,
          canonical_en: row.canonical_en,
          is_custom: row.is_custom || false,
          definition_en: row.definition_en || '',
          definition_status: row.definition_status || 'draft',
        }));

      const rasa = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM rasa_terms ORDER BY canonical_en'
      );

      const guna = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM guna_terms ORDER BY canonical_en'
      );

      const virya = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM virya_terms ORDER BY canonical_en'
      );

      const vipaka = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM vipaka_terms ORDER BY canonical_en'
      );

      const karma = await client.query(
        'SELECT id, slug, canonical_en, is_custom, definition_en, definition_status FROM karma_terms ORDER BY canonical_en'
      );

      const indications = await client.query(
        'SELECT id, slug, canonical_en, is_custom, definition_en, definition_status FROM indication_terms ORDER BY canonical_en'
      );

      const dhatu = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM dhatu_terms ORDER BY canonical_en'
      );

      const mala = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM mala_terms ORDER BY canonical_en'
      );

      const srotas = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM srotas_terms ORDER BY canonical_en'
      );

      const avayava = await client.query(
        'SELECT id, slug, canonical_en, definition_en, definition_status FROM avayava_terms ORDER BY canonical_en'
      );

      res.json({
        rasa: formatTerms(rasa.rows),
        guna: formatTerms(guna.rows),
        virya: formatTerms(virya.rows),
        vipaka: formatTerms(vipaka.rows),
        karma: formatTerms(karma.rows),
        indications: formatTerms(indications.rows),
        dhatu: formatTerms(dhatu.rows),
        mala: formatTerms(mala.rows),
        srotas: formatTerms(srotas.rows),
        avayava: formatTerms(avayava.rows),
        // Flag that Organ filter has no data
        hasOrganData: avayava.rows.length > 0,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching vocabulary filters:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary filters' });
  }
});

// POST /api/vocabulary/karma - create custom Karma term (editor+)
router.post('/karma', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const body = createKarmaSchema.parse(req.body);
    const client = await pool.connect();
    try {
      const slug = body.canonical_en.toLowerCase().replace(/\s+/g, '-');
      const { rows } = await client.query(
        `INSERT INTO karma_terms (canonical_en, slug, is_custom) 
         VALUES ($1, $2, true) 
         RETURNING *`,
        [body.canonical_en, slug]
      );
      res.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/vocabulary/indications - create custom Indication term (editor+)
router.post('/indications', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const body = createIndicationSchema.parse(req.body);
    const client = await pool.connect();
    try {
      const slug = body.canonical_en.toLowerCase().replace(/\s+/g, '-');
      const { rows } = await client.query(
        `INSERT INTO indication_terms (canonical_en, slug, is_custom) 
         VALUES ($1, $2, true) 
         RETURNING *`,
        [body.canonical_en, slug]
      );
      res.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

router.patch('/:category/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const terms = getManagedTerms(req.params.category);
    const id = termIdSchema.parse(req.params.id);
    const body = updateTermSchema.parse(req.body);
    const slug = body.canonical_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const client = await pool.connect();
    try {
      const beforeResult = await client.query(`SELECT * FROM ${terms.table} WHERE id = $1`, [id]);
      if (beforeResult.rows.length === 0) return res.status(404).json({ error: 'Vocabulary term not found' });
      const result = await client.query(
        `UPDATE ${terms.table} SET canonical_en = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [body.canonical_en, slug, id]
      );
      await logAudit({
        userId: req.user.id,
        action: 'update',
        entityType: `${terms.vocabulary}_term`,
        entityId: String(id),
        before: beforeResult.rows[0],
        after: result.rows[0],
      });
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

router.post('/:category/:id/merge', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const terms = getManagedTerms(req.params.category);
    const sourceId = termIdSchema.parse(req.params.id);
    const { target_id: targetId } = mergeTermSchema.parse(req.body);
    if (sourceId === targetId) return res.status(400).json({ error: 'A term cannot be merged into itself' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const source = await client.query(`SELECT * FROM ${terms.table} WHERE id = $1`, [sourceId]);
      const target = await client.query(`SELECT * FROM ${terms.table} WHERE id = $1`, [targetId]);
      if (!source.rows[0] || !target.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Source or target vocabulary term not found' });
      }
      await client.query(
        `INSERT INTO ${terms.junction} (herb_id, ${terms.column})
         SELECT herb_id, $1 FROM ${terms.junction} WHERE ${terms.column} = $2
         ON CONFLICT DO NOTHING`,
        [targetId, sourceId]
      );
      await client.query(`DELETE FROM ${terms.junction} WHERE ${terms.column} = $1`, [sourceId]);
      await client.query(`DELETE FROM ${terms.table} WHERE id = $1`, [sourceId]);
      await client.query('COMMIT');
      await logAudit({
        userId: req.user.id,
        action: 'merge',
        entityType: `${terms.vocabulary}_term`,
        entityId: String(sourceId),
        before: source.rows[0],
        after: { merged_into: target.rows[0] },
      });
      res.json({ merged: source.rows[0], target: target.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

const reviewListSchema = z.object({
  status: z.enum(['draft', 'approved', 'rejected']).optional().default('draft'),
  vocabulary: z.enum(['karma', 'indication', 'karma_terms', 'indication_terms']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const proposeSynonymSchema = z.object({
  vocabulary: z.enum(['karma', 'indication', 'karma_terms', 'indication_terms']),
  termId: z.coerce.number().int().positive(),
  languageCode: z.string().min(2).max(10).optional().default('en-IN'),
  text: z.string().trim().min(1).max(200),
});

router.post('/synonyms/propose', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const body = proposeSynonymSchema.parse(req.body);
    const result = await proposeSynonym({
      vocabulary: body.vocabulary,
      termId: body.termId,
      languageCode: body.languageCode,
      text: body.text,
      userId: req.user.id,
    });
    if (result.error === 'unsupported_vocabulary' || result.error === 'invalid_text') {
      return res.status(400).json({ error: 'Invalid synonym proposal' });
    }
    if (result.error === 'missing_term') return res.status(404).json({ error: 'Vocabulary term not found' });
    if (result.error === 'duplicate') {
      return res.status(409).json({ error: 'This synonym already exists for the term' });
    }
    res.status(201).json(result.item);
  } catch (error) {
    next(error);
  }
});

router.get('/synonyms/review', authenticate, synonymReviewRoles, async (req, res, next) => {
  try {
    const query = reviewListSchema.parse(req.query);
    const result = await listSynonymReviews(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/synonyms/review/:id', authenticate, synonymReviewRoles, async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const item = await getSynonymReviewById(id);
    if (!item) return res.status(404).json({ error: 'Synonym mapping not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/synonyms/review/:id/approve', authenticate, synonymReviewRoles, async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await approveSynonym(id, req.user.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Synonym mapping not found' });
    if (result.error === 'conflict') return res.status(409).json({ error: 'Synonym mapping was already reviewed' });
    if (result.error === 'missing_term' || result.error === 'unsupported_vocabulary') {
      return res.status(400).json({ error: 'Synonym mapping references invalid vocabulary data' });
    }
    res.json(result.item);
  } catch (error) {
    next(error);
  }
});

router.post('/synonyms/review/:id/reject', authenticate, synonymReviewRoles, async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = z.object({ reason: z.string().max(500).optional() }).parse(req.body || {});
    const result = await rejectSynonym(id, req.user.id, body.reason);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Synonym mapping not found' });
    if (result.error === 'conflict') return res.status(409).json({ error: 'Synonym mapping was already reviewed' });
    if (result.error === 'missing_term' || result.error === 'unsupported_vocabulary') {
      return res.status(400).json({ error: 'Synonym mapping references invalid vocabulary data' });
    }
    res.json(result.item);
  } catch (error) {
    next(error);
  }
});

router.delete('/:category/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const terms = getManagedTerms(req.params.category);
    const id = termIdSchema.parse(req.params.id);
    const client = await pool.connect();
    try {
      const beforeResult = await client.query(`SELECT * FROM ${terms.table} WHERE id = $1`, [id]);
      if (beforeResult.rows.length === 0) return res.status(404).json({ error: 'Vocabulary term not found' });
      const usage = await client.query(`SELECT COUNT(*)::int AS count FROM ${terms.junction} WHERE ${terms.column} = $1`, [id]);
      if (usage.rows[0].count > 0) return res.status(409).json({ error: 'Cannot delete a term used by herbs; merge it instead' });
      await client.query(`DELETE FROM ${terms.table} WHERE id = $1`, [id]);
      await logAudit({
        userId: req.user.id,
        action: 'delete',
        entityType: `${terms.vocabulary}_term`,
        entityId: String(id),
        before: beforeResult.rows[0],
        after: null,
      });
      res.status(204).end();
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export { router as vocabularyRouter };
