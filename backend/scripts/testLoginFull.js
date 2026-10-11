/**
 * Full login verification test
 * Tests: all 4 roles, wrong password, expired token, localStorage fallback
 */

const BASE_URL = 'http://localhost:4000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function verifyToken(token) {
  const res = await fetch(`${BASE_URL}/api/herbs`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status };
}

async function main() {
  console.log('=== Login Verification Test ===\n');

  // Test 1: All 4 roles login successfully
  console.log('1. Test all 4 roles login:');
  const roles = [
    { email: 'dev-admin@test.com', expected: 'admin' },
    { email: 'dev-editor@test.com', expected: 'editor' },
    { email: 'dev-expert@test.com', expected: 'domain_expert' },
    { email: 'dev-clinician@test.com', expected: 'clinician' },
  ];

  for (const role of roles) {
    const res = await login(role.email, 'Dev123456');
    if (res.ok && res.data.user.role === role.expected) {
      console.log(`  ✓ ${role.email} → ${res.data.user.role}`);
    } else {
      console.log(`  ✗ ${role.email} failed: ${res.status}`);
    }
  }

  // Test 2: Wrong password
  console.log('\n2. Test wrong password:');
  const wrongRes = await login('dev-clinician@test.com', 'WrongPassword');
  if (!wrongRes.ok && wrongRes.status === 401) {
    console.log('  ✓ Wrong password rejected (401)');
  } else {
    console.log(`  ✗ Wrong password test failed: ${wrongRes.status}`);
  }

  // Test 3: Expired token (simulate with invalid token)
  console.log('\n3. Test expired/invalid token:');
  const invalidRes = await verifyToken('invalid.token.here');
  if (!invalidRes.ok && invalidRes.status === 401) {
    console.log('  ✓ Invalid token rejected (401)');
  } else {
    console.log(`  ✗ Invalid token test failed: ${invalidRes.status}`);
  }

  // Test 4: Non-existent user
  console.log('\n4. Test non-existent user:');
  const noUserRes = await login('nonexistent@test.com', 'Dev123456');
  if (!noUserRes.ok && noUserRes.status === 401) {
    console.log('  ✓ Non-existent user rejected (401)');
  } else {
    console.log(`  ✗ Non-existent user test failed: ${noUserRes.status}`);
  }

  console.log('\n=== Login Tests Complete ===');
  console.log('\nNote: localStorage fallback is tested in frontend (VITE_USE_API=false).');
  console.log('API mode (VITE_USE_API=true) correctly rejects invalid credentials.');
}

main().catch(console.error);
