import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginUser, registerUser } from '../services/auth/authService.js';
import { requestPasswordReset, confirmPasswordReset } from '../services/auth/passwordResetService.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
});
const resetRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const resetConfirmLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({
  email: z.string().email(), password: z.string().min(10),
  fullName: z.string().min(1).optional(), name: z.string().min(1).optional(), role: z.unknown().optional(),
}).refine((body) => Boolean(body.fullName || body.name), { message: 'fullName is required' });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const user = await registerUser({ email: body.email, password: body.password, fullName: body.fullName || body.name });
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    next(error);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginUser(body);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(result);
  } catch (error) { next(error); }
});

authRouter.post('/password-reset/request', resetRequestLimiter, async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    await requestPasswordReset(body.email);
    res.status(202).json({ message: 'If an account exists for that address, password reset instructions will be sent.' });
  } catch (error) { next(error); }
});

authRouter.post('/password-reset/confirm', resetConfirmLimiter, async (req, res, next) => {
  try {
    const body = z.object({ token: z.string().min(32).max(256), password: z.string().min(10) }).parse(req.body);
    const changed = await confirmPasswordReset(body.token, body.password);
    if (!changed) return res.status(400).json({ error: 'Invalid or expired password reset token' });
    res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) { next(error); }
});
