import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import {
  isStorageConfigured,
  uploadProfilePhotoToSupabase,
  deleteStorageObject,
} from '../services/storage/supabaseStorageService.js';
import { getSupabaseAdmin } from '../services/auth/supabaseAuthService.js';

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

const emailChangeSchema = z.object({
  newEmail: z.string().trim().email(),
  password: z.string().min(1).optional(),
}).strict();

const profilePhotoSchema = z.object({
  profilePhotoDataUrl: z.union([z.string().max(400_000), z.null()]),
}).strict();

function isAllowedProfilePhotoDataUrl(value) {
  if (value === null) return true;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value);
}

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

router.patch('/profile-photo', async (req, res, next) => {
  try {
    const body = profilePhotoSchema.parse(req.body);
    if (!isAllowedProfilePhotoDataUrl(body.profilePhotoDataUrl)) {
      return res.status(400).json({ error: 'Profile photo must be a JPEG, PNG, WebP, or GIF image.' });
    }

    // Fetch existing user profile to check existing storage object
    const { rows: currentRows } = await pool.query(
      'SELECT id, preferences FROM users WHERE id = $1',
      [req.user.id]
    );
    const existingStoragePath = currentRows[0]?.preferences?.profile_photo_storage_path;

    let finalPhotoUrl = body.profilePhotoDataUrl;
    let newStoragePath = null;

    if (body.profilePhotoDataUrl === null) {
      // Deletion: remove object from Supabase Storage if present
      if (existingStoragePath) {
        await deleteStorageObject(existingStoragePath).catch(() => {});
      }
    } else if (body.profilePhotoDataUrl.startsWith('data:image/') && isStorageConfigured() && process.env.NODE_ENV !== 'test') {
      // Upload to Supabase Storage
      const match = body.profilePhotoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
      if (match) {
        const contentType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        try {
          const uploaded = await uploadProfilePhotoToSupabase({
            userId: req.user.id,
            buffer,
            contentType,
          });
          finalPhotoUrl = uploaded.imageUrl;
          newStoragePath = uploaded.bucketPath;

          // Remove old object if different
          if (existingStoragePath && existingStoragePath !== newStoragePath) {
            await deleteStorageObject(existingStoragePath).catch(() => {});
          }
        } catch (uploadErr) {
          // Fall back gracefully to storing data URL
          finalPhotoUrl = body.profilePhotoDataUrl;
        }
      }
    }

    const photoJson = finalPhotoUrl === null ? 'null' : JSON.stringify(finalPhotoUrl);
    const storagePathJson = newStoragePath ? JSON.stringify(newStoragePath) : 'null';

    const { rows } = await pool.query(
      `UPDATE users SET
         preferences = jsonb_set(
           jsonb_set(COALESCE(preferences, '{}'::jsonb), '{profile_photo_data_url}', $1::jsonb, true),
           '{profile_photo_storage_path}', $2::jsonb, true
         ),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, display_name, role, status, created_at,
                 preferred_language, preferences`,
      [photoJson, storagePathJson, req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

router.post('/email', async (req, res, next) => {
  try {
    const body = emailChangeSchema.parse(req.body);
    const newEmail = body.newEmail.toLowerCase().trim();

    // Check for conflict
    const { rows: conflict } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail, req.user.id]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ error: 'Email address already in use by another account' });
    }

    // Update in Supabase Auth
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(req.user.id, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        return res.status(400).json({ error: authErr.message });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET email = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name, display_name, role, status, created_at,
                 preferred_language, preferences`,
      [newEmail, req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json({
      message: 'Email address updated successfully',
      data: rows[0],
    });
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

    // Keep Supabase Auth synchronized
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.auth.admin.updateUserById(req.user.id, { password: body.newPassword }).catch(() => {});
      await pool.query('UPDATE auth.users SET encrypted_password = $1 WHERE id = $2', [hash, req.user.id]).catch(() => {});
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

export { router as accountRouter };
