import { env } from '../../config/env.js';

const SMTP_ENV_KEYS = ['SMTP_HOST', 'SMTP_FROM', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'PASSWORD_RESET_PUBLIC_PATH'];

export function isSmtpConfigured() {
  return Boolean(env.smtpHost?.trim() && env.smtpFrom?.trim());
}

/** Required for sending mail; optional auth vars listed when host/from missing. */
export function missingSmtpEnvVars() {
  const missing = [];
  if (!env.smtpHost?.trim()) missing.push('SMTP_HOST');
  if (!env.smtpFrom?.trim()) missing.push('SMTP_FROM');
  return missing;
}

export function smtpEnvKeyCatalog() {
  return [...SMTP_ENV_KEYS];
}
