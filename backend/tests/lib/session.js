import { api } from './http.js';
import { assert } from './assert.js';

const DEV_USERS = {
  admin: { email: 'dev-admin@test.com', role: 'admin' },
  editor: { email: 'dev-editor@test.com', role: 'editor' },
  expert: { email: 'dev-expert@test.com', role: 'domain_expert' },
  clinician: { email: 'dev-clinician@test.com', role: 'clinician' },
};

let cache = null;

export function devPassword() {
  return process.env.DEV_USER_PASSWORD || 'Dev1234567';
}

export async function login(email, password) {
  const result = await api('POST', '/api/auth/login', {
    body: { email, password },
    rateLimitKey: 'integration-dev-login',
  });
  if (!result.ok) {
    return result;
  }
  assert(result.data?.token, 'Login succeeded but token was missing');
  assert(result.data?.user?.role, 'Login succeeded but role was missing');
  return result;
}

export async function getTokens() {
  if (cache) {
    return cache;
  }

  const password = devPassword();
  const tokens = {};
  const users = {};

  for (const [key, account] of Object.entries(DEV_USERS)) {
    const result = await login(account.email, password);
    assert(
      result.ok,
      `Login failed for ${account.role} (${result.status}: ${result.data?.error || 'unknown'})`
    );
    assertEqualRole(result.data.user.role, account.role, account.email);
    tokens[key] = result.data.token;
    users[key] = result.data.user;
  }

  cache = { tokens, users };
  return cache;
}

function assertEqualRole(actual, expected, email) {
  if (actual !== expected) {
    throw new Error(`Role mismatch for ${email}: expected ${expected}, got ${actual}`);
  }
}
