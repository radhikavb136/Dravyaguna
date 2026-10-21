import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit/auditService.js';
import { verifyTranslation } from '../services/translations/translationService.js';

export const translationsRouter = Router();
const verifySchema = z.object({
  content_type: z.enum(['herb', 'vocabulary']),
  content_id: z.string().min(1).max(100),
  field_name: z.enum(['description', 'prabhava', 'part_used', 'definition_en']),
  language: z.enum(['en-IN', 'hi-IN', 'mr-IN', 'sa-IN']),
});
translationsRouter.post('/verify', authenticate, requireRole('admin', 'domain_expert'), async (req, res, next) => {
  try {
    const input = verifySchema.parse(req.body);
    const row = await verifyTranslation({ ...input, contentType: input.content_type, contentId: input.content_id, fieldName: input.field_name, userId: req.user.id });
    if (!row) return res.status(404).json({ error: 'Cached translation not found' });
    await logAudit({ userId: req.user.id, action: 'verify_translation', entityType: `${input.content_type}_translation`, entityId: `${input.content_id}:${input.field_name}:${input.language}`, before: { status: 'machine_translated' }, after: { status: row.status } });
    res.json(row);
  } catch (error) { next(error); }
});

