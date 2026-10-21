import { assert } from './lib/assert.js';
import { api } from './lib/http.js';

export async function run() {
  let sawLimit = false;
  for (let i = 0; i < 30; i += 1) {
    const result = await api('POST', '/api/auth/login', {
      body: { email: 'zz_test_ratelimit@example.com', password: 'wrong-password-xx' },
    });
    if (result.status === 429) {
      sawLimit = true;
      break;
    }
  }
  assert(sawLimit, 'login rate limiter eventually returns 429');
}
