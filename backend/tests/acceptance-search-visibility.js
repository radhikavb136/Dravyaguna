/**
 * Acceptance test for search visibility: 55 → 56 → 56 → 55
 * 
 * This test verifies that:
 * 1. Clinician search with Tikta + Deepana returns 55 herbs (reviewed/verified only)
 * 2. Adding a reviewed herb returns 56
 * 3. Verifying the herb still returns 56
 * 4. Soft-deleting the herb returns to 55
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const BASE_URL = 'http://localhost:4000';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function registerUser(email, password, name, role) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  if (!res.ok) {
    // User might already exist, that's ok
    return null;
  }
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.log(`  Login failed:`, err);
    return null;
  }
  return res.json();
}

async function searchHerbs(token, filters) {
  const res = await fetch(`${BASE_URL}/api/search/detailed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ filters, limit: 200 }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function createHerb(token, herbData) {
  const res = await fetch(`${BASE_URL}/api/herbs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(herbData),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function updateHerb(token, herbId, herbData) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(herbData),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function verifyHerb(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function deleteHerb(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function registerUser(email, password, name, role) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  if (!res.ok) {
    // User might already exist, that's ok
    return null;
  }
  return res.json();
}

async function main() {
  console.log('=== Search Visibility Acceptance Test (55 → 56 → 56 → 55) ===\n');

  // Create or use test users
  console.log('1. Setting up test users...');
  await registerUser('clinician@test.com', 'Test123456', 'Test Clinician', 'clinician');
  await registerUser('editor@test.com', 'Test123456', 'Test Editor', 'editor');
  await registerUser('expert@test.com', 'Test123456', 'Test Expert', 'domain_expert');
  await registerUser('admin@test.com', 'Test123456', 'Test Admin', 'admin');

  // Update roles in database (register defaults to clinician)
  await pool.query("UPDATE users SET role = $1 WHERE email = $2", ['editor', 'editor@test.com']);
  await pool.query("UPDATE users SET role = $1 WHERE email = $2", ['domain_expert', 'expert@test.com']);
  await pool.query("UPDATE users SET role = $1 WHERE email = $2", ['admin', 'admin@test.com']);
  console.log('  Users ready\n');

  const clinicianRes = await login('clinician@test.com', 'Test123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    await pool.end();
    return;
  }
  const clinicianToken = clinicianRes.token;
  console.log('  Clinician logged in\n');

  // Test 1: Baseline search should return 55
  console.log('2. Test: Baseline search (Tikta + Deepana) should return 55');
  const baseline = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const baselineCount = baseline.data.results?.length || 0;
  console.log(`  Results: ${baselineCount} (expected: 55) ${baselineCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 2: Create herb with Tikta + Deepana
  console.log('3. Test: Create herb with Tikta + Deepana');
  const editorRes = await login('editor@test.com', 'Test123456');
  const editorToken = editorRes?.token;
  
  if (!editorToken) {
    console.log('Failed to login editor');
    await pool.end();
    return;
  }

  const testHerb = {
    code: 'ACCEPTANCE_TEST_001',
    english_name: 'Acceptance Test Herb',
    sanskrit_name: 'Test Sanskrit',
    rasa: ['Tikta'],
    karma: ['Deepana'],
  };
  
  const createRes = await createHerb(editorToken, testHerb);
  const herbId = createRes.data.id;
  console.log(`  Created herb ID: ${herbId}, status: ${createRes.data.status}\n`);

  // Test 3: Still 55 (draft not visible to clinician)
  console.log('4. Test: Draft herb invisible (should still be 55)');
  const draftSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const draftCount = draftSearch.data.results?.length || 0;
  console.log(`  Results: ${draftCount} (expected: 55) ${draftCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 4: Move to reviewed → 56
  console.log('5. Test: Move to reviewed (should be 56)');
  await updateHerb(editorToken, herbId, { status: 'reviewed' });
  const reviewedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const reviewedCount = reviewedSearch.data.results?.length || 0;
  console.log(`  Results: ${reviewedCount} (expected: 56) ${reviewedCount === 56 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 5: Verify → still 56
  console.log('6. Test: Verify herb (should still be 56)');
  const expertRes = await login('expert@test.com', 'Test123456');
  const expertToken = expertRes?.token;
  
  if (!expertToken) {
    console.log('Failed to login expert');
    await pool.end();
    return;
  }

  await verifyHerb(expertToken, herbId);
  const verifiedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const verifiedCount = verifiedSearch.data.results?.length || 0;
  console.log(`  Results: ${verifiedCount} (expected: 56) ${verifiedCount === 56 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 6: Soft delete → back to 55
  console.log('7. Test: Soft delete herb (should return to 55)');
  const adminRes = await login('admin@test.com', 'Test123456');
  const adminToken = adminRes?.token;
  
  if (!adminToken) {
    console.log('Failed to login admin');
    await pool.end();
    return;
  }

  await deleteHerb(adminToken, herbId);
  const deletedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const deletedCount = deletedSearch.data.results?.length || 0;
  console.log(`  Results: ${deletedCount} (expected: 55) ${deletedCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Cleanup
  console.log('8. Cleanup...');
  await pool.query('DELETE FROM herbs WHERE code = $1', ['ACCEPTANCE_TEST_001']);
  await pool.query('DELETE FROM search_events WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%@test.com']);
  await pool.query('DELETE FROM audit_log WHERE actor_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%@test.com']);
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  console.log('  Cleanup complete\n');

  console.log('=== Test Complete ===');
  await pool.end();
}

main().catch(console.error);
