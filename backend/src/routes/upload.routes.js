import { Router } from 'express';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireRole } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { logAudit } from '../services/audit/auditService.js';

export const uploadRouter = Router();
const readImage = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' });

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

uploadRouter.post('/herb-image/:herbId', authenticate, requireRole('editor', 'domain_expert', 'admin'), readImage, async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Send a JPEG, PNG, or WebP image body' });
    if (req.body.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Image must be 2 MB or smaller' });
    const detectedType = detectImageType(req.body);
    if (!detectedType || detectedType !== req.headers['content-type']) return res.status(415).json({ error: 'Image content does not match a supported JPEG, PNG, or WebP type' });
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseStorageBucket) return res.status(503).json({ error: 'Supabase Storage is not configured' });
    if (env.nodeEnv === 'test') return res.status(503).json({ error: 'External storage writes are disabled in tests' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [herb] } = await client.query('SELECT id, image_url FROM herbs WHERE id=$1 FOR UPDATE', [req.params.herbId]);
      if (!herb) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Herb not found' }); }
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[detectedType];
      const bucketPath = `${req.params.herbId}/${randomUUID()}.${extension}`;
      const encodedPath = bucketPath.split('/').map(encodeURIComponent).join('/');
      const baseUrl = env.supabaseUrl.replace(/\/$/, '');
      const upload = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(env.supabaseStorageBucket)}/${encodedPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.supabaseServiceRoleKey}`, apikey: env.supabaseServiceRoleKey, 'Content-Type': detectedType, 'x-upsert': 'false' },
        body: req.body,
        signal: AbortSignal.timeout(15000),
      });
      if (!upload.ok) throw Object.assign(new Error('Image storage rejected the upload'), { statusCode: 502 });
      const imageUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(env.supabaseStorageBucket)}/${encodedPath}`;
      await client.query('UPDATE herbs SET image_url=$2, updated_at=NOW() WHERE id=$1', [req.params.herbId, imageUrl]);
      await client.query('COMMIT');
      await logAudit({ userId: req.user.id, action: 'upload_image', entityType: 'herb', entityId: req.params.herbId, before: { image_url: herb.image_url }, after: { image_url: imageUrl } });
      res.status(201).json({ image_url: imageUrl });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) { next(error); }
});
