import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens, users } = await getTokens();

  const audit = await api('GET', '/api/audit-log', { token: tokens.admin });
  assert(audit.ok, 'admin audit log');
  assert(Array.isArray(audit.data.data), 'audit data array');

  const clinicianAudit = await api('GET', '/api/audit-log', { token: tokens.clinician });
  assertEqual(clinicianAudit.status, 403, 'clinician cannot read audit');

  const analytics = await api('GET', '/api/analytics/search', { token: tokens.expert });
  assert(analytics.ok, 'domain expert can read search analytics');

  const clinicianAnalytics = await api('GET', '/api/analytics/search', {
    token: tokens.clinician,
  });
  assertEqual(clinicianAnalytics.status, 403, 'clinician cannot read analytics');

  const usersList = await api('GET', '/api/users', { token: tokens.admin });
  assert(usersList.ok, 'list users');

  const expertUsersList = await api('GET', '/api/users', { token: tokens.expert });
  assertEqual(expertUsersList.status, 403, 'domain expert cannot administer user accounts');
  const expertAudit = await api('GET', '/api/audit-log', { token: tokens.expert });
  assertEqual(expertAudit.status, 403, 'domain expert cannot read admin audit log');

  const stamp = Date.now();
  const created = await api('POST', '/api/users', {
    token: tokens.admin,
    body: {
      email: `zz_test_user_${stamp}@example.com`,
      password: 'TestPass1234',
      fullName: 'ZZ Test User',
      role: 'admin',
    },
  });
  assertEqual(created.status, 201, 'admin creates user');
  const userId = created.data.id;

  const userLogin = await api('POST', '/api/auth/login', {
    body: { email: created.data.email, password: 'TestPass1234' },
  });
  assertEqual(userLogin.status, 200, 'new admin can log in');

  const selfDemote = await api('PATCH', `/api/users/${users.admin.id}/role`, {
    token: tokens.admin,
    body: { role: 'editor' },
  });
  assertEqual(selfDemote.status, 403, 'no self-demotion');

  const selfDeactivate = await api('PATCH', `/api/users/${users.admin.id}/status`, {
    token: tokens.admin,
    body: { status: 'inactive' },
  });
  assertEqual(selfDeactivate.status, 403, 'no self-deactivation');

  const demoted = await api('PATCH', `/api/users/${userId}/role`, {
    token: tokens.admin,
    body: { role: 'clinician' },
  });
  assertEqual(demoted.status, 200, 'admin demotes test admin');
  const staleAdminAccess = await api('GET', '/api/users', { token: userLogin.data.token });
  assertEqual(staleAdminAccess.status, 403, 'demoted admin token loses admin permissions immediately');

  const deactivated = await api('PATCH', `/api/users/${userId}/status`, {
    token: tokens.admin,
    body: { status: 'deactivated' },
  });
  assertEqual(deactivated.status, 200, 'deactivate');
  assertEqual(deactivated.data.status, 'inactive', 'stored as inactive');

  const inactiveTokenAccess = await api('GET', '/api/account', { token: userLogin.data.token });
  assertEqual(inactiveTokenAccess.status, 401, 'deactivated account token is rejected immediately');

  const loginDeactivated = await api('POST', '/api/auth/login', {
    body: { email: created.data.email, password: 'TestPass1234' },
  });
  assertEqual(loginDeactivated.status, 401, 'deactivated user cannot log in');

  const reactivated = await api('PATCH', `/api/users/${userId}/status`, {
    token: tokens.admin,
    body: { status: 'active' },
  });
  assertEqual(reactivated.status, 200, 'reactivate');

  const forbiddenDetails = await api('PATCH', `/api/users/${userId}`, {
    token: tokens.clinician,
    body: { fullName: 'Changed Name' },
  });
  assertEqual(forbiddenDetails.status, 403, 'clinician cannot edit users');

  const updatedDetails = await api('PATCH', `/api/users/${userId}`, {
    token: tokens.admin,
    body: { fullName: 'ZZ Updated User', email: `zz_test_updated_${stamp}@example.com` },
  });
  assertEqual(updatedDetails.status, 200, 'admin edits user details');
  assertEqual(updatedDetails.data.data.full_name, 'ZZ Updated User', 'user full name persisted');
  assertEqual(updatedDetails.data.data.email, `zz_test_updated_${stamp}@example.com`, 'user email persisted');

  const invalidDetails = await api('PATCH', `/api/users/${userId}`, {
    token: tokens.admin,
    body: { email: 'not-an-email' },
  });
  assertEqual(invalidDetails.status, 400, 'invalid user email is rejected');

  const auditAfterUserMutations = await api('GET', '/api/audit-log', { token: tokens.admin });
  const userAudit = auditAfterUserMutations.data.data.filter((entry) => entry.record_id === userId);
  assert(userAudit.some((entry) => entry.action === 'user.created'), 'user creation is audited');
  assert(userAudit.some((entry) => entry.action === 'user.role_changed'), 'role changes are audited');
  assert(userAudit.some((entry) => entry.action === 'user.status_changed'), 'status changes are audited');
  assert(userAudit.some((entry) => entry.action === 'user.updated'), 'name and email changes are audited');
}
