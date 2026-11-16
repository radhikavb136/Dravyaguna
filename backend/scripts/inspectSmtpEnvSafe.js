/**
 * SMTP env presence check — no secret values printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { isSmtpConfigured, missingSmtpEnvVars } from '../src/services/auth/smtpConfig.js';
import { buildPasswordResetLink } from '../src/services/auth/emailDeliveryService.js';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const parsed = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));

const host = (parsed.SMTP_HOST || '').trim();
const port = (parsed.SMTP_PORT || '').trim() || '587 (default in code)';
const user = (parsed.SMTP_USER || '').trim();
const origins = (parsed.FRONTEND_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

console.log(JSON.stringify({
  smtpConfigured: isSmtpConfigured(),
  missing_required_env: missingSmtpEnvVars(),
  SMTP_HOST: host ? (host === 'smtp.resend.com' ? 'set (smtp.resend.com)' : 'set (non-resend host)') : 'missing',
  SMTP_PORT: port,
  SMTP_USER: user ? (user === 'resend' ? 'set (resend)' : 'set (other user)') : 'missing',
  SMTP_PASSWORD: parsed.SMTP_PASSWORD?.trim() ? 'set' : 'missing',
  SMTP_FROM: parsed.SMTP_FROM?.trim() ? 'set' : 'missing',
  FRONTEND_ORIGIN_count: origins.length,
  FRONTEND_ORIGIN_first_origin_configured: origins[0] ? 'yes' : 'no',
  PASSWORD_RESET_PUBLIC_PATH: (parsed.PASSWORD_RESET_PUBLIC_PATH || '/password-reset').trim(),
  sample_reset_link_shape: buildPasswordResetLink('sample-token-placeholder').replace('sample-token-placeholder', '<token>'),
}, null, 2));
