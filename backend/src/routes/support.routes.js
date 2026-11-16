import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { rateLimitClientKey } from '../middleware/rateLimitKey.js';
import {
  SUPPORT_TOPICS,
  SUPPORT_STATUSES,
  countSupportRequestsForAdmin,
  createSupportRequest,
  listSupportRequestsForAdmin,
  listSupportRequestsForUser,
  updateSupportRequestStatus,
} from '../services/support/supportService.js';

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitClientKey,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
});

const topicEnum = z.enum([...SUPPORT_TOPICS]);

const submitSchema = z.object({
  topic: topicEnum,
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
});

router.post('/support/requests', submitLimiter, authenticate, async (req, res, next) => {
  try {
    const body = submitSchema.parse(req.body);
    const request = await createSupportRequest({
      userId: req.user.id,
      topic: body.topic,
      message: body.message,
    });
    res.status(201).json({ data: request });
  } catch (error) {
    next(error);
  }
});

router.get('/support/requests/mine', authenticate, async (req, res, next) => {
  try {
    const data = await listSupportRequestsForUser(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/support/requests', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [data, total] = await Promise.all([
      listSupportRequestsForAdmin({ limit, offset }),
      countSupportRequestsForAdmin(),
    ]);
    res.json({
      data,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

const statusSchema = z.object({
  status: z.enum([...SUPPORT_STATUSES]),
});

router.patch('/support/requests/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const idParsed = z.string().uuid().safeParse(req.params.id);
    if (!idParsed.success) {
      return res.status(400).json({ error: 'Invalid support request id' });
    }
    const body = statusSchema.parse(req.body);
    const updated = await updateSupportRequestStatus({
      requestId: idParsed.data,
      status: body.status,
      adminUserId: req.user.id,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Support request not found' });
    }
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

export const supportRouter = router;
