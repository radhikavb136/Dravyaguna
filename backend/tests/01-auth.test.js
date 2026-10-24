import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens, login, devPassword } from './lib/session.js';

export async function run() {
  const { users } = await getTokens();
  assertEqual(users.admin.role, 'admin', 'admin role');
  assertEqual(users.editor.role, 'editor', 'editor role');
  assertEqual(users.expert.role, 'domain_expert', 'expert role');
  assertEqual(users.clinician.role, 'clinician', 'clinician role');

  const wrong = await login('dev-clinician@test.com', 'not-the-password');
  assertEqual(wrong.status, 401, 'wrong password');

  const missing = await login('zz_test_missing@test.com', devPassword());
  assertEqual(missing.status, 401, 'unknown user');

  const invalid = await api('GET', '/api/herbs', { token: 'not-a-jwt' });
  assertEqual(invalid.status, 401, 'invalid token');

  const health = await api('GET', '/api/health');
  assertEqual(health.status, 200, '/api/health');
  assertEqual(health.data.status, 'ok', 'health status');

  const alias = await api('GET', '/health');
  assertEqual(alias.status, 200, '/health alias');

  const stamp = Date.now();
  const register = await api('POST', '/api/auth/register', {
    body: {
      email: `zz_test_register_${stamp}@example.com`,
      password: 'TestPass1234',
      fullName: 'ZZ Test Register',
      role: 'admin',
    },
  });
  assertEqual(register.status, 201, 'register');
  assertEqual(register.data.user.role, 'clinician', 'register ignores requested role');

  const registeredEmail = `zz_test_register_${stamp}@example.com`;
  const loginAfterRegister = await login(registeredEmail, 'TestPass1234');
  assertEqual(loginAfterRegister.status, 200, 'login after register');
  assert(loginAfterRegister.data?.token, 'login after register returns token');

  const short = await api('POST', '/api/auth/register', {
    body: {
      email: `zz_test_short_${stamp}@example.com`,
      password: 'short',
      fullName: 'ZZ Test Short',
    },
  });
  assert(short.status === 400, `short password should be 400, got ${short.status}`);
}
