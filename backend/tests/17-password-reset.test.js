import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTestPool } from './lib/testPool.js';
import { requestPasswordReset } from '../src/services/auth/passwordResetService.js';

const pool = getTestPool();

export async function run() {
  const stamp = Date.now();
  const email = `zz_test_reset_${stamp}@test.com`;
  const password = 'TestPassword-123';
  const registered = await api('POST', '/api/auth/register', { body: { email, fullName: 'ZZ Test Password Reset', password } });
  assertEqual(registered.status, 201, 'creates a reset test account');
  const health = await api('GET', '/api/health');
  const resetRateLimitEnabled = health.data?.passwordResetRateLimitEnabled !== false;
  const rateLimitKey = `password-reset-${stamp}`;

  const known = await api('POST', '/api/auth/password-reset/request', { body: { email }, rateLimitKey });
  const unknown = await api('POST', '/api/auth/password-reset/request', { body: { email: `missing_${stamp}@test.com` }, rateLimitKey });
  assertEqual(known.status, 202, 'request returns accepted for an existing user');
  assertEqual(unknown.status, 202, 'request returns accepted for an unknown user');
  assertEqual(known.data.message, unknown.data.message, 'request response does not reveal account existence');
  if (resetRateLimitEnabled) {
    for (let requestNumber = 3; requestNumber <= 5; requestNumber += 1) {
      const allowed = await api('POST', '/api/auth/password-reset/request', {
        body: { email: `missing_${stamp}@test.com` },
        rateLimitKey,
      });
      assertEqual(allowed.status, 202, `reset request ${requestNumber} remains within rate limit`);
    }
    const limited = await api('POST', '/api/auth/password-reset/request', {
      body: { email: `missing_${stamp}@test.com` },
      rateLimitKey,
    });
    assertEqual(limited.status, 429, 'password reset requests are rate limited');
  } else {
    console.log('  (skip: password-reset rate limit assertions; API has DISABLE_RATE_LIMIT=true)');
  }

  let resetToken = '';
  await requestPasswordReset(email, { deliver: async ({ token }) => { resetToken = token; } });
  assert(resetToken.length >= 40, 'email adapter receives an unpersisted raw token');
  const stored = await pool.query('SELECT token_hash, expires_at, used_at FROM password_reset_tokens WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [registered.data.user.id]);
  assert(stored.rows[0] && stored.rows[0].token_hash !== resetToken, 'database stores only a token hash');
  assert(stored.rows[0].expires_at > new Date(), 'token expiry is in the future');

  const changed = await api('POST', '/api/auth/password-reset/confirm', { body: { token: resetToken, password: 'AnotherPassword-456' } });
  assertEqual(changed.status, 200, 'valid token changes password');
  const reused = await api('POST', '/api/auth/password-reset/confirm', { body: { token: resetToken, password: 'YetAnotherPassword-789' } });
  assertEqual(reused.status, 400, 'reset token cannot be used twice');
  const login = await api('POST', '/api/auth/login', { body: { email, password: 'AnotherPassword-456' } });
  assertEqual(login.status, 200, 'new password authenticates');
}
