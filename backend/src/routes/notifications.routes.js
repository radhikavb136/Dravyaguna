import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from '../services/notifications/notificationService.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(30),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }).parse(req.query);
    const result = await listNotificationsForUser(req.user.id, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await unreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const item = await markNotificationRead(req.user.id, id);
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
