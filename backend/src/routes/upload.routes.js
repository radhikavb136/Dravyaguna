import { Router } from 'express';
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { logAudit } from '../services/audit/auditService.js';
import {
  detectImageType,
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
} from '../services/storage/imageValidation.js';
import {
  isStorageConfigured,
  isValidHerbId,
  missingStorageEnvVars,
  uploadHerbImageToSupabase,
} from '../services/storage/supabaseStorageService.js';

export const uploadRouter = Router();
const readImage = express.raw({ type: [...SUPPORTED_IMAGE_TYPES], limit: `${MAX_IMAGE_BYTES}b` });

uploadRouter.post('/herb-image/:herbId', authenticate, requireRole('editor', 'domain_expert', 'admin'), readImage, async (req, res, next) => {
  try {
    if (!isValidHerbId(req.params.herbId)) {
      return res.status(400).json({ error: 'Invalid herb id' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Send a JPEG, PNG, or WebP image body' });
    }
    if (req.body.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Image must be 2 MB or smaller' });
    }
    const detectedType = detectImageType(req.body);
    const declaredType = req.headers['content-type'];
    if (!detectedType || !SUPPORTED_IMAGE_TYPES.has(detectedType) || detectedType !== declaredType) {
      return res.status(415).json({ error: 'Image content does not match a supported JPEG, PNG, or WebP type' });
    }
    const client = await pool.connect();
    let herb;
    try {
      const { rows } = await client.query('SELECT id, image_url FROM herbs WHERE id=$1', [req.params.herbId]);
      herb = rows[0];
    } finally {
      client.release();
    }
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }

    if (env.nodeEnv === 'test') {
      return res.status(503).json({ error: 'External storage writes are disabled in tests' });
    }
    if (!isStorageConfigured()) {
      return res.status(503).json({
        error: 'Supabase Storage is not configured',
        missing_env: missingStorageEnvVars(),
      });
    }

    const uploadClient = await pool.connect();
    try {
      await uploadClient.query('BEGIN');
      const { rows: [locked] } = await uploadClient.query('SELECT id, image_url FROM herbs WHERE id=$1 FOR UPDATE', [req.params.herbId]);
      if (!locked) {
        await uploadClient.query('ROLLBACK');
        return res.status(404).json({ error: 'Herb not found' });
      }

      const { imageUrl } = await uploadHerbImageToSupabase({
        herbId: req.params.herbId,
        buffer: req.body,
        contentType: detectedType,
      });

      await uploadClient.query('UPDATE herbs SET image_url=$2, updated_at=NOW() WHERE id=$1', [req.params.herbId, imageUrl]);
      await uploadClient.query('COMMIT');
      await logAudit({
        userId: req.user.id,
        action: 'upload_image',
        entityType: 'herb',
        entityId: req.params.herbId,
        before: { image_url: locked.image_url },
        after: { image_url: imageUrl },
      });
      res.status(201).json({ image_url: imageUrl });
    } catch (error) {
      await uploadClient.query('ROLLBACK');
      throw error;
    } finally {
      uploadClient.release();
    }
  } catch (error) {
    next(error);
  }
});
