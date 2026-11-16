import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { rateLimitClientKey } from '../middleware/rateLimitKey.js';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateExplanation } from '../services/explain/explainService.js';
import { filtersSchema } from './search.routes.js';

const explainSchema = z.object({
  herb_id: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(500).optional(),
  filters: filtersSchema.optional().default({}),
  lang: z.enum(['en-IN', 'hi-IN', 'mr-IN', 'sa-IN']).optional().default('en-IN'),
}).strict().refine((body) => Boolean(body.herb_id || body.question), {
  message: 'Provide a herb_id or a question',
});

const explanationLimiter = rateLimit({
  windowMs: 60_000,
  limit: process.env.NODE_ENV === 'test' ? 500 : 10,
  keyGenerator: (req) => {
    const testKey = rateLimitClientKey(req);
    if (testKey && testKey !== req.ip) return testKey;
    return req.user?.id || req.ip;
  },
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
      question: body.question,
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
