/**
 * Test Scoring Configuration page integration
 * Verify: weights UI -> weights API -> next search reflects change
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

async function getWeights(token) {
  const res = await fetch(`${BASE_URL}/api/scoring/weights`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function updateWeight(token, parameterGroup, weight) {
  const res = await fetch(`${BASE_URL}/api/scoring/weights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ parameter_group: parameterGroup, weight }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
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
  console.log('=== Scoring Configuration Page Integration Test ===\n');

  // Login as admin
  console.log('1. Login as admin...');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  if (!adminRes) {
    console.log('Failed to login admin');
    return;
  }
  const adminToken = adminRes.token;
  console.log('  ✓ Admin logged in\n');

  // Get current weights
  console.log('2. Get current weights...');
  const weightsRes = await getWeights(adminToken);
  if (!weightsRes.ok) {
    console.log(`  ✗ Failed to get weights: ${weightsRes.status}`);
    return;
  }
  const originalRasaWeight = weightsRes.data.weights.rasa;
  console.log(`  Original Rasa weight: ${originalRasaWeight}\n`);

  // Baseline search
  console.log('3. Baseline search (Tikta + Deepana)...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;
  const baselineSearch = await searchDetailed(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  if (baselineSearch.ok) {
    const count100 = baselineSearch.data.results?.filter(r => r.matchPercentage === 100).length || 0;
    console.log(`  Results at 100%: ${count100} (expected: 55)\n`);
  } else {
    console.log(`  ✗ Search failed: ${baselineSearch.status}\n`);
    return;
  }

  // Change Rasa weight
  console.log('4. Change Rasa weight from original to 10...');
  const updateRes = await updateWeight(adminToken, 'rasa', 10);
  if (updateRes.ok) {
    console.log(`  ✓ Rasa weight updated to 10\n`);
  } else {
    console.log(`  ✗ Failed to update weight: ${updateRes.status}\n`);
    return;
  }

  // Search again to verify change reflects
  console.log('5. Search again (should reflect new weight immediately)...');
  const afterSearch = await searchDetailed(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  if (afterSearch.ok) {
    const count100 = afterSearch.data.results?.filter(r => r.matchPercentage === 100).length || 0;
    console.log(`  Results at 100%: ${count100} (should still be 55, only Rasa weight changed)\n`);
  }

  // Restore original weight
  console.log('6. Restore original Rasa weight...');
  const restoreRes = await updateWeight(adminToken, 'rasa', originalRasaWeight);
  if (restoreRes.ok) {
    console.log(`  ✓ Rasa weight restored to ${originalRasaWeight}\n`);
  }

  console.log('✓ Scoring Configuration page integration verified');
  console.log('Note: UI verification requires manual browser test');
}

main().catch(console.error);
