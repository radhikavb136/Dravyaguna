/**
 * Test detailed search integration
 * Verifies Tikta + Deepana returns 55 herbs for a clinician
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

async function searchDetailed(token, filters) {
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

async function main() {
  console.log('=== Detailed Search Integration Test ===\n');

  // Login as clinician
  console.log('1. Login as clinician...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    return;
  }
  const clinicianToken = clinicianRes.token;
  console.log('  ✓ Clinician logged in\n');

  // Test Tikta + Deepana search
  console.log('2. Search for Tikta + Deepana (expected: 55 herbs)...');
  const searchRes = await searchDetailed(clinicianToken, {
    rasa: ['Tikta'],
    karma: ['Deepana'],
  });

  if (searchRes.ok) {
    const count = searchRes.data.results?.length || 0;
    console.log(`  Results: ${count} (expected: 55) ${count === 55 ? '✓ PASS' : '✗ FAIL'}`);
    
    if (count > 0) {
      console.log(`  First herb: ${searchRes.data.results[0].english_name}`);
    }
  } else {
    console.log(`  ✗ Search failed: ${searchRes.status}`);
    console.log(`  Error:`, searchRes.data);
  }
}

main().catch(console.error);
