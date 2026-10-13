/**
 * Test partial matches in search
 * Search Rasa=Tikta + Virya=Ushna
 * Expected: 108 herbs (63 at 100%, 28 Tikta-only, 17 Ushna-only)
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
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Partial Matches Test (Tikta + Ushna) ===\n');

  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    return;
  }
  const clinicianToken = clinicianRes.token;

  // Search Tikta + Ushna
  console.log('Search: Rasa=Tikta + Virya=Ushna');
  const searchRes = await searchDetailed(clinicianToken, { rasa: ['Tikta'], virya: ['Ushna'] });
  if (searchRes.ok) {
    const results = searchRes.data.results || [];
    const count = results.length;
    console.log(`  Total results: ${count} (expected: 108) ${count === 108 ? '✓' : '✗'}`);

    // Count by match percentage
    const match100 = results.filter(r => r.matchPercentage === 100).length;
    const match50_99 = results.filter(r => r.matchPercentage >= 50 && r.matchPercentage < 100).length;
    const match0_49 = results.filter(r => r.matchPercentage > 0 && r.matchPercentage < 50).length;
    const match0 = results.filter(r => r.matchPercentage === 0).length;

    console.log(`  100% match: ${match100} (expected: 63) ${match100 === 63 ? '✓' : '✗'}`);
    console.log(`  50-99% match: ${match50_99}`);
    console.log(`  1-49% match: ${match0_49}`);
    console.log(`  0% match: ${match0} (should be 0) ${match0 === 0 ? '✓' : '✗'}`);

    // Show sample results
    console.log('\nSample results:');
    results.slice(0, 5).forEach(r => {
      console.log(`  ${r.code}: ${r.englishName} - ${r.matchPercentage}%`);
    });
  } else {
    console.log(`  ✗ Search failed: ${searchRes.status}`);
  }
}

main().catch(console.error);
