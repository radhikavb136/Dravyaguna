/**
 * Acceptance test for search visibility: 55 → 56 → 56 → 55
 * 
 * This test verifies that:
 * 1. Clinician search with Tikta + Deepana returns 55 herbs at 100% match (reviewed/verified only)
 * 2. Adding a reviewed herb returns 56 at 100%
 * 3. Verifying the herb still returns 56 at 100%
 * 4. Soft-deleting the herb returns to 55 at 100%
 * 
 * Note: Partial matches are included in total results but not counted in the 55/56/56/55 sequence
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const BASE_URL = 'http://localhost:4000';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function devPassword() {
  return process.env.DEV_USER_PASSWORD || 'Dev1234567';
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    let err = text;
    try {
      err = JSON.parse(text);
    } catch {
      // plain-text rate limit or proxy body
    }
    console.log(`  Login failed (${res.status}):`, err);
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

async function main() {
  console.log('=== Search Visibility Acceptance Test (55 → 56 → 56 → 55) ===\n');

  // Use dev users
  console.log('1. Using dev users...\n');

  const clinicianRes = await login('dev-clinician@test.com', devPassword());
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    await pool.end();
    return;
  }
  const clinicianToken = clinicianRes.token;
  console.log('  Clinician logged in\n');

  // Test 1: Baseline search should return 55 (100% matches only)
  console.log('2. Test: Baseline search (Tikta + Deepana) should return 55 herbs at 100%');
  const baseline = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const baselineResults = baseline.data.results || [];
  const baselineCount = baselineResults.filter(r => r.matchPercentage === 100).length;
  console.log(`  Total results: ${baselineResults.length}`);
  console.log(`  100% matches: ${baselineCount} (expected: 55) ${baselineCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 2: Create herb with Tikta + Deepana
  console.log('3. Test: Create herb with Tikta + Deepana');
  const editorRes = await login('dev-editor@test.com', devPassword());
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
  console.log('4. Test: Draft herb invisible (should still be 55 at 100%)');
  const draftSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const draftResults = draftSearch.data.results || [];
  const draftCount = draftResults.filter(r => r.matchPercentage === 100).length;
  console.log(`  Total results: ${draftResults.length}`);
  console.log(`  100% matches: ${draftCount} (expected: 55) ${draftCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 4: Move to reviewed → 56
  console.log('5. Test: Move to reviewed (should be 56 at 100%)');
  await updateHerb(editorToken, herbId, { status: 'reviewed' });
  const reviewedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const reviewedResults = reviewedSearch.data.results || [];
  const reviewedCount = reviewedResults.filter(r => r.matchPercentage === 100).length;
  console.log(`  Total results: ${reviewedResults.length}`);
  console.log(`  100% matches: ${reviewedCount} (expected: 56) ${reviewedCount === 56 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 5: Verify → still 56
  console.log('6. Test: Verify herb (should still be 56 at 100%)');
  const expertRes = await login('dev-expert@test.com', devPassword());
  const expertToken = expertRes?.token;
  
  if (!expertToken) {
    console.log('Failed to login expert');
    await pool.end();
    return;
  }

  await verifyHerb(expertToken, herbId);
  const verifiedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const verifiedResults = verifiedSearch.data.results || [];
  const verifiedCount = verifiedResults.filter(r => r.matchPercentage === 100).length;
  console.log(`  Total results: ${verifiedResults.length}`);
  console.log(`  100% matches: ${verifiedCount} (expected: 56) ${verifiedCount === 56 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 6: Soft delete → back to 55
  console.log('7. Test: Soft delete herb (should return to 55 at 100%)');
  const adminRes = await login('dev-admin@test.com', devPassword());
  const adminToken = adminRes?.token;
  
  if (!adminToken) {
    console.log('Failed to login admin');
    await pool.end();
    return;
  }

  await deleteHerb(adminToken, herbId);
  const deletedSearch = await searchHerbs(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  const deletedResults = deletedSearch.data.results || [];
  const deletedCount = deletedResults.filter(r => r.matchPercentage === 100).length;
  console.log(`  Total results: ${deletedResults.length}`);
  console.log(`  100% matches: ${deletedCount} (expected: 55) ${deletedCount === 55 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Cleanup
  console.log('8. Cleanup...');
  await pool.query('DELETE FROM herbs WHERE code = $1', ['ACCEPTANCE_TEST_001']);
  console.log('  Cleanup complete\n');

  console.log('=== Test Complete ===');
  await pool.end();
}

main().catch(console.error);
