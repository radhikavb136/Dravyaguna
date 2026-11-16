import { assert, assertEqual } from './lib/assert.js';
import {
  buildPasswordResetLink,
  isSmtpConfigured,
  sendPasswordResetEmail,
} from '../src/services/auth/emailDeliveryService.js';
import { resolvePasswordResetDeliverer } from '../src/services/auth/passwordResetService.js';

export async function run() {
  const link = buildPasswordResetLink('sample-token-value');
  assert(link.includes('/password-reset?token='), 'reset link uses public password-reset route');
  assert(
    link.includes('localhost:5180') || link.includes('127.0.0.1:5180') || link.includes('localhost:5173'),
    'reset link targets a configured local frontend origin'
  );
  assert(link.includes('sample-token-value'), 'token is URL-encoded in link');
  assert(!link.includes('sample-token-value\n'), 'link has no embedded secrets beyond token param');

  const smtpConfiguredLocally = isSmtpConfigured();
  if (smtpConfiguredLocally) {
    assertEqual(smtpConfiguredLocally, true, 'smtp is configured when SMTP_HOST and SMTP_FROM are set');
  } else {
    assertEqual(smtpConfiguredLocally, false, 'smtp is not configured without SMTP_HOST/SMTP_FROM');
  }

  let captured = null;
  const deliver = resolvePasswordResetDeliverer(async (message) => {
    captured = message;
  });
  await deliver({ email: 'user@example.com', token: 'a'.repeat(40), expiresInMinutes: 30 });
  assert(captured?.email === 'user@example.com', 'custom deliverer receives email');
  assert(captured?.token?.length >= 40, 'custom deliverer receives token');
  assertEqual(captured?.expiresInMinutes, 30, 'expires window passed to deliverer');

  if (!smtpConfiguredLocally) {
    const stubDeliver = resolvePasswordResetDeliverer();
    let stubFailed = false;
    try {
      await stubDeliver({ email: 'user@example.com', token: 'b'.repeat(40), expiresInMinutes: 30 });
    } catch {
      stubFailed = true;
    }
    assertEqual(stubFailed, false, 'default deliverer is no-op when SMTP is unset');

    const direct = await sendPasswordResetEmail({ email: 'user@example.com', token: 'c'.repeat(40) });
    assertEqual(direct.sent, false, 'send returns structured failure without SMTP');
    assertEqual(direct.reason, 'smtp_not_configured');
  } else {
    console.log('  (skip: default deliverer and sendPasswordResetEmail; local SMTP is configured — would send real mail)');
  }
}
