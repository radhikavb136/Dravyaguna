/**
 * Admin API routes
 * Audit Log, Search Analytics, User & Role Management
 */

import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit-log - get audit log entries (admin only)
router.get('/audit-log', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM audit_log 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), parseInt(offset)]
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/search - get search analytics (admin only)
router.get('/analytics/search', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get search event counts by day
      const { rows } = await client.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as search_count
         FROM search_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/users - get all users (admin only)
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, email, role, status, created_at 
         FROM users 
         ORDER BY created_at DESC`
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role - update user role (admin only)
router.patch('/users/:id/role', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['admin', 'editor', 'domain_expert', 'clinician'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role`,
        [role, id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };
