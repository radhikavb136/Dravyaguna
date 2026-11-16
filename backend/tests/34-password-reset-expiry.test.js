import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTestPool } from './lib/testPool.js';
import { requestPasswordReset, confirmPasswordReset } from '../src/services/auth/passwordResetService.js';
import { createHash } from 'node:crypto';

const pool = getTestPool();
const digest = (token) => createHash('sha256').update(token).digest('hex');

export async function run() {
  const stamp = Date.now();
  const email = `zz_test_reset_exp_${stamp}@test.com`;
  const password = 'TestPassword-123';
  const registered = await api('POST', '/api/auth/register', {
    body: { email, fullName: 'ZZ Reset Expiry', password },
  });
  assertEqual(registered.status, 201, 'creates expiry test account');

  let rawToken = '';
  await requestPasswordReset(email, {
    deliver: async ({ token }) => {
      rawToken = token;
    },
  });
  assert(rawToken.length >= 40, 'reset flow yields a raw token for testing');

  await pool.query(
    `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'
     WHERE user_id = $1 AND used_at IS NULL`,
    [registered.data.user.id]
  );

  const expired = await api('POST', '/api/auth/password-reset/confirm', {
    body: { token: rawToken, password: 'NewPassword-456' },
  });
  assertEqual(expired.status, 400, 'expired token is rejected over HTTP');

  const direct = await confirmPasswordReset(rawToken, 'AnotherPassword-789');
  assertEqual(direct, false, 'expired token is rejected in service layer');

  const hash = digest(rawToken);
  const row = await pool.query(
    'SELECT used_at FROM password_reset_tokens WHERE token_hash = $1',
    [hash]
  );
  assert(!row.rows[0]?.used_at, 'expired token is not marked used');
}
