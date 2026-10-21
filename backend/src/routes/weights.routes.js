import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getScoringWeights,
  invalidateScoringWeightsCache,
} from '../services/scoring/weightsCache.js';
import { ROLES } from '../utils/roles.js';

export const weightsRouter = Router();

weightsRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const weights = await getScoringWeights();
    res.json({ weights });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  parameterGroup: z.string().min(1),
  weight: z.number().positive(),
}).or(
  z.object({
    parameter_group: z.string().min(1),
    weight: z.number().positive(),
  })
);

const bulkUpdateSchema = z.object({
  weights: z.record(z.string().min(1), z.number().positive().max(100)).refine(
    (weights) => Object.keys(weights).length > 0,
    'At least one scoring weight is required'
  ),
}).strict();

weightsRouter.put(
  '/bulk',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DOMAIN_EXPERT),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { weights } = bulkUpdateSchema.parse(req.body);
      await client.query('BEGIN');
      const { rows: beforeRows } = await client.query(
        'SELECT parameter_group, weight::float AS weight FROM scoring_weights ORDER BY parameter_group FOR UPDATE'
      );
      const known = new Set(beforeRows.map((row) => row.parameter_group));
      const unknown = Object.keys(weights).filter((key) => !known.has(key));
      if (unknown.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Unknown scoring parameter: ${unknown.join(', ')}` });
      }
      for (const [parameterGroup, weight] of Object.entries(weights)) {
        await client.query(
          `UPDATE scoring_weights SET weight = $1, updated_by = $2, updated_at = now()
           WHERE parameter_group = $3`,
          [weight, req.user.id, parameterGroup]
        );
      }
      const before = Object.fromEntries(beforeRows.map(({ parameter_group, weight }) => [parameter_group, weight]));
      const after = { ...before, ...weights };
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_json, after_json)
         VALUES ($1, 'scoring.weights.updated', 'scoring_weights', 'all', $2::jsonb, $3::jsonb)`,
        [req.user.id, JSON.stringify(before), JSON.stringify(after)]
      );
      await client.query('COMMIT');
      invalidateScoringWeightsCache();
      res.json({ weights: await getScoringWeights() });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

weightsRouter.put(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.DOMAIN_EXPERT),
  async (req, res, next) => {
    try {
      const body = updateSchema.parse(req.body);
      const parameterGroup = body.parameterGroup || body.parameter_group;
      await pool.query(
        `UPDATE scoring_weights
         SET weight = $1, updated_by = $2, updated_at = now()
         WHERE parameter_group = $3`,
        [body.weight, req.user.id, parameterGroup]
      );
      invalidateScoringWeightsCache();
      const weights = await getScoringWeights();
      res.json({ weights });
    } catch (err) {
      next(err);
    }
  }
);
