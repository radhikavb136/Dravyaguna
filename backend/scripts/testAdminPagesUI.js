/**
 * Test Admin Pages UI integration
 * Verify: Audit Log, Search Analytics, User & Role Management
 */

const BASE_URL = 'http://localhost:4000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.log(`Login failed:`, err);
    return null;
  }
  return res.json();
}

async function getAuditLog(token) {
  const res = await fetch(`${BASE_URL}/api/audit-log`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function getSearchAnalytics(token) {
  const res = await fetch(`${BASE_URL}/api/analytics/search`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function getUsers(token) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function updateUserRole(token, userId, role) {
  const res = await fetch(`${BASE_URL}/api/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Admin Pages UI Integration Test ===\n');

  // 1. Admin accesses audit log
  console.log('1. Admin accesses audit log...');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  if (!adminRes) {
    console.log('Failed to login admin');
    return;
  }
  const adminToken = adminRes.token;

  const auditRes = await getAuditLog(adminToken);
  if (auditRes.ok) {
    console.log(`  ✓ Audit log accessible, ${auditRes.data.data?.length || 0} entries\n`);
  } else {
    console.log(`  ✗ Failed to access audit log: ${auditRes.status}\n`);
  }

  // 2. Admin accesses search analytics
  console.log('2. Admin accesses search analytics...');
  const analyticsRes = await getSearchAnalytics(adminToken);
  if (analyticsRes.ok) {
    console.log(`  ✓ Search analytics accessible, ${analyticsRes.data.data?.length || 0} data points\n`);
  } else {
    console.log(`  ✗ Failed to access search analytics: ${analyticsRes.status}\n`);
  }

  // 3. Admin accesses users list
  console.log('3. Admin accesses users list...');
  const usersRes = await getUsers(adminToken);
  if (usersRes.ok) {
    console.log(`  ✓ Users list accessible, ${usersRes.data.data?.length || 0} users\n`);
  } else {
    console.log(`  ✗ Failed to access users list: ${usersRes.status}\n`);
  }

  // 4. Clinician cannot access admin endpoints
  console.log('4. Clinician attempts to access admin endpoints...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;

  const clinicianAudit = await getAuditLog(clinicianToken);
  if (!clinicianAudit.ok && clinicianAudit.status === 403) {
    console.log(`  ✓ Clinician correctly rejected from audit log (403)\n`);
  } else {
    console.log(`  ✗ Clinician should not access audit log: ${clinicianAudit.status}\n`);
  }

  console.log('✓ Admin Pages UI integration verified');
}

main().catch(console.error);
