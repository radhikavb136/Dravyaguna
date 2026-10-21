/**
 * Admin API routes
 * Audit Log, Search Analytics, User & Role Management
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { createXlsxWorkbook } from '../utils/xlsxWorkbook.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const SALT_ROUNDS = 12;
const VALID_ROLES = ['admin', 'editor', 'domain_expert', 'clinician'];

router.get('/admin/export', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const format = z.enum(['csv', 'xlsx']).parse(req.query.format || 'csv');
    const { rows } = await pool.query(`
      SELECT h.code, h.english_name, h.sanskrit_name, h.botanical_name, h.local_name, h.family,
             h.part_used, h.description,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_rasa j JOIN rasa_terms t ON t.id=j.rasa_id WHERE j.herb_id=h.id) AS rasa,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_guna j JOIN guna_terms t ON t.id=j.guna_id WHERE j.herb_id=h.id) AS guna,
             (SELECT canonical_en FROM virya_terms WHERE id=h.virya_id) AS virya,
             (SELECT canonical_en FROM vipaka_terms WHERE id=h.vipaka_id) AS vipaka,
             h.prabhava,
             (SELECT string_agg(d.dosha::text || ':' || d.effect::text, '; ' ORDER BY d.dosha) FROM herb_dosha_actions d WHERE d.herb_id=h.id) AS dosha_actions,
             (SELECT string_agg(t.canonical_en || ':' || j.score::text, '; ' ORDER BY t.canonical_en) FROM herb_dhatu j JOIN dhatu_terms t ON t.id=j.dhatu_id WHERE j.herb_id=h.id) AS dhatu,
             (SELECT string_agg(t.canonical_en || ':' || j.effect::text, '; ' ORDER BY t.canonical_en) FROM herb_mala j JOIN mala_terms t ON t.id=j.mala_id WHERE j.herb_id=h.id) AS mala,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_srotas j JOIN srotas_terms t ON t.id=j.srotas_id WHERE j.herb_id=h.id) AS srotas,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_avayava j JOIN avayava_terms t ON t.id=j.avayava_id WHERE j.herb_id=h.id) AS avayava,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_karma j JOIN karma_terms t ON t.id=j.karma_id WHERE j.herb_id=h.id) AS karma,
             (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_indications j JOIN indication_terms t ON t.id=j.indication_id WHERE j.herb_id=h.id) AS indications,
             h.raw_karma, h.raw_indication, h.status::text AS status, h.image_url,
             (SELECT string_agg(concat_ws(' | ', r.source, r.chapter_ref, r.citation_text), '; ' ORDER BY r.id) FROM herb_references r WHERE r.herb_id=h.id) AS references
      FROM herbs h ORDER BY h.code
    `);
    const headers = [
      ['code', 'Code'], ['english_name', 'English Name'], ['sanskrit_name', 'Sanskrit Name'],
      ['botanical_name', 'Botanical Name'], ['local_name', 'Local Name'], ['family', 'Family'],
      ['part_used', 'Part Used'], ['description', 'Description'], ['rasa', 'Rasa'], ['guna', 'Guna'],
      ['virya', 'Virya'], ['vipaka', 'Vipaka'], ['prabhava', 'Prabhava'], ['dosha_actions', 'Dosha Actions'],
      ['dhatu', 'Dhatu'], ['mala', 'Mala'], ['srotas', 'Srotas'], ['avayava', 'Avayava'],
      ['karma', 'Karma'], ['indications', 'Indications'], ['raw_karma', 'Raw Karma'],
      ['raw_indication', 'Raw Indications'], ['status', 'Status'], ['image_url', 'Image URL'], ['references', 'References'],
    ];
    if (format === 'xlsx') {
      const workbook = createXlsxWorkbook(headers, rows);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="dravyaguna-herbs.xlsx"',
        'Cache-Control': 'no-store',
      });
      return res.send(workbook);
    }
    const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [headers.map(([, label]) => csvCell(label)).join(','), ...rows.map((row) => headers.map(([key]) => csvCell(row[key])).join(','))].join('\r\n');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="dravyaguna-herbs.csv"', 'Cache-Control': 'no-store' });
    res.send(`\uFEFF${csv}`);
  } catch (error) { next(error); }
});

function mapStatus(input) {
  if (input === 'deactivated' || input === 'inactive') {
    return 'inactive';
  }
  if (input === 'active') {
    return 'active';
  }
  return null;
}

router.get('/audit-log', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT a.id, a.created_at, u.email AS user_email, u.role AS user_role,
                a.action, a.entity_type AS table_name, a.entity_id AS record_id,
                a.before_json, a.after_json
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit, 10), parseInt(offset, 10)]
      );
      res.json({ data: rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

router.get(
  '/analytics/search',
  authenticate,
  requireRole('admin', 'domain_expert'),
  async (req, res, next) => {
    try {
      const parsedDays = Number.parseInt(req.query.days, 10) || 30;
      const days = Math.min(Math.max(parsedDays, 1), 365);
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT
             DATE(created_at) as date,
             mode,
             COUNT(*)::int as search_count,
             ROUND(AVG(top_match_pct))::int AS average_match,
             COUNT(*) FILTER (WHERE result_count = 0)::int AS zero_match_count,
             COUNT(*) FILTER (WHERE top_match_pct > 0 AND top_match_pct < 40)::int AS weak_match_count,
             ROUND(AVG(result_count))::int AS average_result_count
           FROM search_events
           WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
           GROUP BY DATE(created_at), mode
           ORDER BY date DESC`,
          [days]
        );
        res.json({ data: rows });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, email, full_name, role, status, created_at
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

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  fullName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor', 'domain_expert', 'clinician']),
});

router.post('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const fullName = body.fullName || body.name;
    if (!fullName) {
      return res.status(400).json({ error: 'fullName is required' });
    }
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, email, full_name, role, status, created_at`,
        [body.email.toLowerCase(), passwordHash, fullName, body.role]
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_json, after_json)
         VALUES ($1, 'user.created', 'users', $2, '{}'::jsonb, $3::jsonb)`,
        [req.user.id, rows[0].id, JSON.stringify(rows[0])]
      );
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

router.patch('/users/:id/role', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (id === req.user.id) {
      return res.status(403).json({ error: 'An admin cannot change their own role' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query(
        `SELECT id, email, full_name, role, status FROM users WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (existing.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      if (existing[0].role === 'admin' && role !== 'admin') {
        const { rows: activeAdmins } = await client.query(
          `SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE`
        );
        if (activeAdmins.length <= 1) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Cannot remove the last admin' });
        }
      }
      const { rows } = await client.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, status`,
        [role, id]
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_json, after_json)
         VALUES ($1, 'user.role_changed', 'users', $2, $3::jsonb, $4::jsonb)`,
        [req.user.id, id, JSON.stringify(existing[0]), JSON.stringify(rows[0])]
      );
      await client.query('COMMIT');
      res.json(rows[0]);
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

const statusSchema = z.object({
  status: z.enum(['active', 'inactive', 'deactivated']),
});

const userDetailsSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
}).strict().refine((body) => body.fullName !== undefined || body.email !== undefined, {
  message: 'At least one user detail must be provided',
});

router.patch('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const body = userDetailsSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: beforeRows } = await client.query(
        'SELECT id, email, full_name FROM users WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      if (!beforeRows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      const before = beforeRows[0];
      const { rows } = await client.query(
        `UPDATE users SET full_name = COALESCE($1, full_name),
                          email = COALESCE($2, email), updated_at = NOW()
         WHERE id = $3 RETURNING id, email, full_name, role, status, created_at`,
        [body.fullName, body.email?.toLowerCase(), req.params.id]
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_json, after_json)
         VALUES ($1, 'user.updated', 'users', $2, $3::jsonb, $4::jsonb)`,
        [req.user.id, req.params.id, JSON.stringify(before), JSON.stringify(rows[0])]
      );
      await client.query('COMMIT');
      res.json({ data: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

router.patch('/users/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = statusSchema.parse(req.body);
    const status = mapStatus(body.status);
    if (!status) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (id === req.user.id) {
      return res.status(403).json({ error: 'An admin cannot deactivate themselves' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query(
        `SELECT id, email, full_name, role, status FROM users WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (existing.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      if (existing[0].role === 'admin' && status === 'inactive') {
        const { rows: activeAdmins } = await client.query(
          `SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE`
        );
        if (activeAdmins.length <= 1) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Cannot deactivate the last admin' });
        }
      }
      const { rows } = await client.query(
        `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, status`,
        [status, id]
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, before_json, after_json)
         VALUES ($1, 'user.status_changed', 'users', $2, $3::jsonb, $4::jsonb)`,
        [req.user.id, id, JSON.stringify(existing[0]), JSON.stringify(rows[0])]
      );
      await client.query('COMMIT');
      res.json(rows[0]);
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

export { router as adminRouter };
