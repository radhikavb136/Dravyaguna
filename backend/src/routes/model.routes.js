import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getModelStatus,
  updateModelConfig,
  recordInteraction,
  runTrainingCycle,
  listLearnedAssociations,
  updateAssociationStatus,
  deleteAssociation,
} from '../services/learning/selfLearningService.js';

export const modelRouter = Router();

const configSchema = z.object({
  enabled: z.boolean().optional(),
  learningMode: z.enum(['continuous', 'supervised']).optional(),
  sensitivity: z.enum(['low', 'balanced', 'high']).optional(),
  autoSynonyms: z.boolean().optional(),
  minInteractionThreshold: z.number().int().min(1).max(50).optional(),
});

const feedbackSchema = z.object({
  queryText: z.string().trim().min(1).max(300),
  herbId: z.string().uuid(),
  interactionType: z.enum(['click', 'view', 'compare', 'favorite', 'prescription']).default('click'),
});

// GET /api/model/status — Model state and training metrics
modelRouter.get('/status', authenticate, async (req, res, next) => {
  try {
    const status = await getModelStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// PUT /api/model/config — Update hyperparameters (admin only)
modelRouter.put('/config', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const parsed = configSchema.parse(req.body);
    const updated = await updateModelConfig(parsed);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// POST /api/model/train — Trigger model training cycle (admin, domain_expert, editor)
modelRouter.post('/train', authenticate, requireRole(['admin', 'domain_expert', 'editor']), async (req, res, next) => {
  try {
    const result = await runTrainingCycle();
    res.json({
      success: true,
      message: 'Self-learning model trained successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/model/feedback — Record positive clinician interaction signal
modelRouter.post('/feedback', authenticate, async (req, res, next) => {
  try {
    const parsed = feedbackSchema.parse(req.body);
    const result = await recordInteraction({
      ...parsed,
      userId: req.user?.id,
    });
    res.status(201).json({ success: true, recorded: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// GET /api/model/associations — List learned query-herb concepts
modelRouter.get('/associations', authenticate, requireRole(['admin', 'domain_expert', 'editor']), async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await listLearnedAssociations({
      status: status || null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/model/associations/:id — Update status of a learned association
modelRouter.patch('/associations/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await updateAssociationStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Association not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/model/associations/:id — Delete an association
modelRouter.delete('/associations/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const deleted = await deleteAssociation(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Association not found' });
    res.json({ success: true, message: 'Association removed' });
  } catch (err) {
    next(err);
  }
});
