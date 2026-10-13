/**
 * Vocabulary API routes
 * Provides filter options for the frontend
 */

import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Schema for creating custom terms
const createKarmaSchema = z.object({
  canonical_en: z.string().min(1),
});

const createIndicationSchema = z.object({
  canonical_en: z.string().min(1),
});

// Get all vocabulary terms for filters
router.get('/filters', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get Rasa
      const rasa = await client.query(
        'SELECT id, canonical_en FROM rasa_terms ORDER BY canonical_en'
      );

      // Get Guna
      const guna = await client.query(
        'SELECT id, canonical_en FROM guna_terms ORDER BY canonical_en'
      );

      // Get Virya
      const virya = await client.query(
        'SELECT id, canonical_en FROM virya_terms ORDER BY canonical_en'
      );

      // Get Vipaka
      const vipaka = await client.query(
        'SELECT id, canonical_en FROM vipaka_terms ORDER BY canonical_en'
      );

      // Get Karma
      const karma = await client.query(
        'SELECT id, canonical_en FROM karma_terms ORDER BY canonical_en'
      );

      // Get Indications
      const indications = await client.query(
        'SELECT id, canonical_en FROM indication_terms ORDER BY canonical_en'
      );

      // Get Dhatu
      const dhatu = await client.query(
        'SELECT id, canonical_en FROM dhatu_terms ORDER BY canonical_en'
      );

      // Get Mala
      const mala = await client.query(
        'SELECT id, canonical_en FROM mala_terms ORDER BY canonical_en'
      );

      // Get Srotas
      const srotas = await client.query(
        'SELECT id, canonical_en FROM srotas_terms ORDER BY canonical_en'
      );

      // Get Avayava (Organ)
      const avayava = await client.query(
        'SELECT id, canonical_en FROM avayava_terms ORDER BY canonical_en'
      );

      res.json({
        rasa: rasa.rows,
        guna: guna.rows,
        virya: virya.rows,
        vipaka: vipaka.rows,
        karma: karma.rows,
        indications: indications.rows,
        dhatu: dhatu.rows,
        mala: mala.rows,
        srotas: srotas.rows,
        avayava: avayava.rows,
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

export { router as vocabularyRouter };
