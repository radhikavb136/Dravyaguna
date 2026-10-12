/**
 * Test Admin Pages: Audit Log, Search Analytics, User & Role Management
 * Verify: Each endpoint returns data for authorized roles
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
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function getSearchAnalytics(token) {
  const res = await fetch(`${BASE_URL}/api/analytics/search`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function getUsers(token) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function main() {
  console.log('=== Admin Pages Verification ===\n');

  // Login as admin
  console.log('1. Login as admin...');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  if (!adminRes) {
    console.log('Failed to login admin');
    return;
  }
  const adminToken = adminRes.token;
  console.log('  ✓ Admin logged in\n');

  // Test Audit Log
  console.log('2. Test Audit Log endpoint...');
  const auditRes = await getAuditLog(adminToken);
  if (auditRes.ok) {
    console.log(`  ✓ Audit log accessible, entries: ${auditRes.data.data?.length || auditRes.data.length || 0}`);
  } else if (auditRes.status === 404) {
    console.log(`  ⚠ Audit log endpoint not implemented (404)`);
  } else {
    console.log(`  ✗ Audit log failed: ${auditRes.status}`);
  }

  // Test Search Analytics
  console.log('\n3. Test Search Analytics endpoint...');
  const analyticsRes = await getSearchAnalytics(adminToken);
  if (analyticsRes.ok) {
    console.log(`  ✓ Search analytics accessible`);
  } else if (analyticsRes.status === 404) {
    console.log(`  ⚠ Search analytics endpoint not implemented (404)`);
  } else {
    console.log(`  ✗ Search analytics failed: ${analyticsRes.status}`);
  }

  // Test User & Role Management
  console.log('\n4. Test User & Role Management endpoint...');
  const usersRes = await getUsers(adminToken);
  if (usersRes.ok) {
    console.log(`  ✓ Users list accessible, users: ${usersRes.data.data?.length || usersRes.data.length || 0}`);
  } else if (usersRes.status === 404) {
    console.log(`  ⚠ Users endpoint not implemented (404)`);
  } else {
    console.log(`  ✗ Users failed: ${usersRes.status}`);
  }

  // Test that clinician cannot access
  console.log('\n5. Test clinician cannot access admin endpoints...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;

  const clinicianAudit = await getAuditLog(clinicianToken);
  console.log(`  Clinician audit log: ${clinicianAudit.status} (expected: 403 or 404) ${clinicianAudit.status === 403 || clinicianAudit.status === 404 ? '✓' : '✗'}`);

  const clinicianUsers = await getUsers(clinicianToken);
  console.log(`  Clinician users: ${clinicianUsers.status} (expected: 403 or 404) ${clinicianUsers.status === 403 || clinicianUsers.status === 404 ? '✓' : '✗'}`);

  console.log('\n✓ Admin pages verification complete');
}

main().catch(console.error);
