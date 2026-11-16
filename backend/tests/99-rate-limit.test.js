import { assert } from './lib/assert.js';
import { api } from './lib/http.js';

export async function run() {
  const health = await api('GET', '/api/health');
  if (health.data?.loginRateLimitEnabled === false) {
    console.log('  (skip: API started with DISABLE_RATE_LIMIT=true)');
    return;
  }
  if (process.env.NODE_ENV === 'test') {
    console.log('  (skip: login 429 hammer; NODE_ENV=test API uses elevated login limit — production remains 20/15min)');
    return;
  }

  let sawLimit = false;
  for (let i = 0; i < 30; i += 1) {
    const result = await api('POST', '/api/auth/login', {
      body: { email: 'zz_test_ratelimit@example.com', password: 'wrong-password-xx' },
      rateLimitKey: 'integration-login-rate-limit',
    });
    if (result.status === 429) {
      sawLimit = true;
      break;
    }
  }
  assert(sawLimit, 'login rate limiter eventually returns 429');
}
