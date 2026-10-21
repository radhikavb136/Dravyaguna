import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listHerbs,
  getHerbById,
  createHerb,
  updateHerb,
  verifyHerb,
  deleteHerb,
} from '../services/herbs/herbService.js';

export const herbRouter = Router();

// Validation schemas
const herbQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  status: z.enum(['draft', 'reviewed', 'verified', 'archived']).optional(),
});

const slugOrCustom = z.union([
  z.string().min(1),
  z.object({ custom: z.string().min(1) }),
]);

const herbCreateSchema = z.object({
  code: z.string().min(1),
  english_name: z.string().min(1),
  sanskrit_name: z.string().optional(),
  botanical_name: z.string().optional(),
  local_name: z.string().optional(),
  family: z.string().optional(),
  part_used: z.string().optional(),
  description: z.string().optional(),
  identification_notes: z.string().optional(),
  prabhava: z.string().optional(),
  virya: z.string().optional(),
  vipaka: z.string().optional(),
  rasa: z.array(z.string().min(1)).optional(),
  guna: z.array(z.string().min(1)).optional(),
  karma: z.array(slugOrCustom).optional(),
  indications: z.array(slugOrCustom).optional(),
  dosha_actions: z
    .array(
      z.object({
        dosha: z.enum(['vata', 'pitta', 'kapha']),
        effect: z.enum(['pacifies', 'increases']),
      })
    )
    .optional(),
  dhatu: z
    .array(
      z.object({
        term: z.string().min(1),
        score: z.number().int().min(0).max(5),
      })
    )
    .optional(),
  mala: z
    .array(
      z.object({
        term: z.string().min(1),
        effect: z.enum(['increases', 'decreases']),
      })
    )
    .optional(),
  srotas: z.array(z.string().min(1)).optional(),
  avayava: z.array(z.string().min(1)).optional(),
  raw_karma: z.string().optional(),
  raw_indication: z.string().optional(),
  references: z.array(z.object({
    source: z.string().optional(),
    chapter: z.string().optional(),
    verse: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
});

const herbUpdateSchema = herbCreateSchema.partial().extend({
  status: z.enum(['draft', 'reviewed', 'verified', 'archived']).optional(),
});

// GET /api/herbs - paginated list with status filter
herbRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const query = herbQuerySchema.parse(req.query);
    const user = req.user;

    // Clinicians only see reviewed/verified
    let allowedStatuses = query.status ? [query.status] : ['draft', 'reviewed', 'verified', 'archived'];
    if (user.role === 'clinician') {
      allowedStatuses = query.status ? [query.status] : ['reviewed', 'verified'];
      if (query.status && !['reviewed', 'verified'].includes(query.status)) {
        return res.status(403).json({ error: 'Clinicians can only view reviewed or verified herbs' });
      }
    }

    const result = await listHerbs({
      page: query.page,
      limit: query.limit,
      statuses: allowedStatuses,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/herbs/:id - full profile
herbRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const herb = await getHerbById(id, user.role);
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }
    res.json(herb);
  } catch (err) {
    next(err);
  }
});

// POST /api/herbs - create herb (editor+)
herbRouter.post('/', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const body = herbCreateSchema.parse(req.body);
    const herb = await createHerb(body, req.user);
    res.status(201).json(herb);
  } catch (err) {
    next(err);
  }
});

// PUT /api/herbs/:id - update herb (editor+)
herbRouter.put('/:id', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = herbUpdateSchema.parse(req.body);
    const herb = await updateHerb(id, body, req.user);
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }
    res.json(herb);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/herbs/:id - partial update (editor+)
herbRouter.patch('/:id', authenticate, requireRole('editor', 'admin', 'domain_expert'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = herbUpdateSchema.parse(req.body);
    const herb = await updateHerb(id, body, req.user);
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }
    res.json(herb);
  } catch (err) {
    next(err);
  }
});

// POST /api/herbs/:id/verify - verify herb (domain_expert+)
herbRouter.post('/:id/verify', authenticate, requireRole('domain_expert', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const herb = await verifyHerb(id, req.user);
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }
    res.json(herb);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/herbs/:id - soft delete (admin only)
herbRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const herb = await deleteHerb(id, req.user);
    if (!herb) {
      return res.status(404).json({ error: 'Herb not found' });
    }
    res.json(herb);
  } catch (err) {
    next(err);
  }
});
