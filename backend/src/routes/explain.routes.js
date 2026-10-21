import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateExplanation } from '../services/explain/explainService.js';
import { filtersSchema } from './search.routes.js';

const explainSchema = z.object({
  herb_id: z.string().uuid(),
  filters: filtersSchema.optional().default({}),
  lang: z.enum(['en-IN', 'hi-IN', 'mr-IN', 'sa-IN']).optional().default('en-IN'),
}).strict();

const explanationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Explanation rate limit exceeded. Try again shortly.' }),
});

export const explainRouter = Router();
explainRouter.use(authenticate);
explainRouter.post('/', explanationLimiter, requireRole('clinician', 'editor', 'domain_expert', 'admin'), async (req, res, next) => {
  try {
    const body = explainSchema.parse(req.body);
    const result = await generateExplanation({
      herbId: body.herb_id,
      filters: body.filters,
      lang: body.lang,
      role: req.user.role,
    });
    if (!result) return res.status(404).json({ error: 'Herb not found' });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
