import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();

  const unauthenticated = await api('POST', '/api/support/requests', {
    body: { topic: 'search', message: 'zz_test support message for auth check' },
  });
  assertEqual(unauthenticated.status, 401, 'support submit requires authentication');

  const clinicianForbidden = await api('GET', '/api/support/requests', {
    token: tokens.clinician,
  });
  assertEqual(clinicianForbidden.status, 403, 'admin list is restricted');

  const shortMessage = await api('POST', '/api/support/requests', {
    token: tokens.clinician,
    body: { topic: 'search', message: 'short' },
  });
  assertEqual(shortMessage.status, 400, 'short message rejected');

  const created = await api('POST', '/api/support/requests', {
    token: tokens.clinician,
    body: {
      topic: 'technical',
      message: `zz_test support request ${Date.now()} with enough detail`,
    },
  });
  assertEqual(created.status, 201, 'support request created');
  assert(created.data?.data?.id, 'returns request id');
  assertEqual(created.data.data.topic, 'technical', 'topic persisted');

  const mine = await api('GET', '/api/support/requests/mine', {
    token: tokens.clinician,
  });
  assert(mine.ok, 'list own support requests');
  assert(
    (mine.data.data || []).some((row) => row.id === created.data.data.id),
    'created request visible to submitter'
  );

  const adminList = await api('GET', '/api/support/requests', {
    token: tokens.admin,
  });
  assert(adminList.ok, 'admin lists support requests');
  assert(
    (adminList.data.data || []).some((row) => row.id === created.data.data.id),
    'admin sees submitted request with user email'
  );
  assert(adminList.data.data[0].user_email, 'admin view includes submitter email');
  assert(adminList.data.pagination?.total >= 1, 'admin list includes pagination total');

  const requestId = created.data.data.id;
  const patchForbidden = await api('PATCH', `/api/support/requests/${requestId}`, {
    token: tokens.clinician,
    body: { status: 'resolved' },
  });
  assertEqual(patchForbidden.status, 403, 'status update restricted to admin');

  const patched = await api('PATCH', `/api/support/requests/${requestId}`, {
    token: tokens.admin,
    body: { status: 'in_progress' },
  });
  assertEqual(patched.status, 200, 'admin updates status');
  assertEqual(patched.data.data.status, 'in_progress', 'status persisted');

  const badStatus = await api('PATCH', `/api/support/requests/${requestId}`, {
    token: tokens.admin,
    body: { status: 'invalid' },
  });
  assertEqual(badStatus.status, 400, 'invalid status rejected');
}
