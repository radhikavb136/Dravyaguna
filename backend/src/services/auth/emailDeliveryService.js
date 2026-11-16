import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { isSmtpConfigured } from './smtpConfig.js';

export { isSmtpConfigured } from './smtpConfig.js';

export function buildPasswordResetLink(token) {
  const origins = env.frontendOrigin?.length ? env.frontendOrigin : ['http://localhost:5180'];
  const origin =
    origins.find((o) => /:5180\b/.test(o))
    || origins.find((o) => /localhost|127\.0\.0\.1/.test(o))
    || origins[0]
    || 'http://localhost:5180';
  const path = env.passwordResetPublicPath.startsWith('/')
    ? env.passwordResetPublicPath
    : `/${env.passwordResetPublicPath}`;
  return `${origin.replace(/\/$/, '')}${path}?token=${encodeURIComponent(token)}`;
}

export function createSmtpTransport() {
  if (!isSmtpConfigured()) return null;
  const secure = env.smtpPort === 465;
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure,
    auth: env.smtpUser
      ? { user: env.smtpUser, pass: env.smtpPassword }
      : undefined,
  });
}

/**
 * Sends reset email when SMTP is configured. Never logs the token or credentials.
 */
export async function sendPasswordResetEmail({ email, token, expiresInMinutes = 30 }) {
  const transport = createSmtpTransport();
  if (!transport) return { sent: false, reason: 'smtp_not_configured' };
  const resetUrl = buildPasswordResetLink(token);
  await transport.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: 'Dravyaguna password reset',
    text:
      `A password reset was requested for your Dravyaguna account.\n\n`
      + `Open this link within ${expiresInMinutes} minutes:\n${resetUrl}\n\n`
      + `If you did not request this, you can ignore this email.`,
  });
  return { sent: true };
}

export function createDefaultPasswordResetDeliverer() {
  return async ({ email, token, expiresInMinutes }) => {
    await sendPasswordResetEmail({ email, token, expiresInMinutes });
  };
}
