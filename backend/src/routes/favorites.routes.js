/**
 * Favorites and Saved Searches API routes
 */

import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();
const herbIdSchema = z.string().uuid();

// GET /api/favorites - get user's favorites
router.get('/favorites', authenticate, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT f.id, f.herb_id, h.code, h.english_name, f.created_at
         FROM favorites f
         JOIN herbs h ON f.herb_id = h.id
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC`,
        [req.user.id]
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites - add favorite
router.post('/favorites', authenticate, async (req, res, next) => {
  try {
    const parsed = herbIdSchema.safeParse(req.body?.herb_id);
    if (!parsed.success) return res.status(400).json({ error: 'herb_id must be a UUID' });
    const herb_id = parsed.data;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO favorites (user_id, herb_id) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id, herb_id) DO NOTHING
         RETURNING *`,
        [req.user.id, herb_id]
      );
      res.json(rows[0] || { message: 'Already favorited' });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/:herb_id - remove favorite
router.delete('/favorites/:herb_id', authenticate, async (req, res, next) => {
  try {
    const parsed = herbIdSchema.safeParse(req.params.herb_id);
    if (!parsed.success) return res.status(400).json({ error: 'herb_id must be a UUID' });
    const herbId = parsed.data;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `DELETE FROM favorites 
         WHERE user_id = $1 AND herb_id = $2 
         RETURNING *`,
        [req.user.id, herbId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Favorite not found' });
      }
      res.json({ message: 'Favorite removed' });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/saved-searches - get user's saved searches
router.get('/saved-searches', authenticate, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM saved_searches 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/saved-searches - save search
router.post('/saved-searches', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(1).max(120),
      filters: z.object({}).passthrough(),
    });
    const body = schema.parse(req.body);

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO saved_searches (user_id, name, filters) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [req.user.id, body.name, JSON.stringify(body.filters)]
      );
      res.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved-searches/:id - remove saved search
router.delete('/saved-searches/:id', authenticate, async (req, res, next) => {
  try {
    const parsedId = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ error: 'Saved search id must be a positive integer' });
    const id = parsedId.data;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `DELETE FROM saved_searches 
         WHERE user_id = $1 AND id = $2 
         RETURNING *`,
        [req.user.id, id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Saved search not found' });
      }
      res.json({ message: 'Saved search removed' });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export { router as favoritesRouter };
