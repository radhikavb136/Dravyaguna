import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(80),
}).strict();
const preferencesSchema = z.object({
  language: z.enum(['en-IN', 'hi-IN', 'mr-IN', 'sa-IN']).optional(),
  preferences: z.object({
    defaultSearch: z.enum(['simple', 'detailed']).optional(),
    resultsPerPage: z.number().int().min(10).max(100).optional(),
    verifiedProfiles: z.boolean().optional(),
    showMatchPercentage: z.boolean().optional(),
    showScoringBreakdown: z.boolean().optional(),
    searchUpdates: z.boolean().optional(),
    savedReminders: z.boolean().optional(),
    referenceUpdates: z.boolean().optional(),
    showClassicalReferences: z.boolean().optional(),
    showVerificationStatus: z.boolean().optional(),
    showClinicalNotes: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    verificationNotifications: z.boolean().optional(),
    systemNotifications: z.boolean().optional(),
    requireReferences: z.boolean().optional(),
    showPendingChanges: z.boolean().optional(),
    showAnalytics: z.boolean().optional(),
    showRecentActivity: z.boolean().optional(),
    activityLogging: z.boolean().optional(),
    confirmBeforeDelete: z.boolean().optional(),
    autoSavePreferences: z.boolean().optional(),
  }).strict().optional(),
}).strict().refine((body) => body.language !== undefined || body.preferences !== undefined, {
  message: 'At least one preference must be provided',
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128),
}).strict();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, display_name, role, status, created_at,
              preferred_language, preferences
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE users SET full_name = $1, display_name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, display_name, role, status, created_at,
                 preferred_language, preferences`,
      [body.fullName, body.displayName, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/preferences', async (req, res, next) => {
  try {
    const body = preferencesSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE users SET
         preferred_language = COALESCE($1, preferred_language),
         preferences = COALESCE(preferences, '{}'::jsonb) || COALESCE($2::jsonb, '{}'::jsonb),
         updated_at = NOW()
       WHERE id = $3
       RETURNING preferred_language, preferences`,
      [body.language || null, body.preferences ? JSON.stringify(body.preferences) : null, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

router.post('/password', async (req, res, next) => {
  try {
    const body = passwordSchema.parse(req.body);
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND status = \'active\'',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found or inactive' });
    const valid = await bcrypt.compare(body.currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(body.newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

export { router as accountRouter };
