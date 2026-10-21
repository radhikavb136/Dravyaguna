/**
 * Vocabulary API routes
 * Provides filter options for the frontend
 */

import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { logAudit } from '../services/audit/auditService.js';

const router = express.Router();

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
