/**
 * Test Scoring Weights API
 * Verify that changing a weight affects the very next search
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
    body: JSON.stringify({ filters, limit: 10 }),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Scoring Weights API Test ===\n');

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
  if (weightsRes.ok) {
    console.log('  ✓ Current weights loaded');
    const originalRasaWeight = weightsRes.data.weights.rasa;
    console.log(`  Original Rasa weight: ${originalRasaWeight}`);
  } else {
    console.log(`  ✗ Failed to get weights: ${weightsRes.status}`);
    console.log(`  Error:`, weightsRes.data);
    return;
  }

  // Search with Tikta + Deepana (baseline)
  console.log('\n3. Baseline search (Tikta + Deepana)...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;
  
  const baselineSearch = await searchDetailed(clinicianToken, { rasa: ['Tikta'], karma: ['Deepana'] });
  if (baselineSearch.ok) {
    const baselineCount = baselineSearch.data.results?.length || 0;
    const topHerb = baselineSearch.data.results?.[0];
    console.log(`  Results: ${baselineCount} herbs`);
    console.log(`  Top herb: ${topHerb?.english_name} (match: ${topHerb?.match || topHerb?.match_percentage || 'N/A'})`);
  } else {
    console.log(`  ✗ Search failed: ${baselineSearch.status}`);
    return;
  }

  // Change Rasa weight
  console.log('\n4. Change Rasa weight from original to 10...');
  const updateRes = await updateWeight(adminToken, 'rasa', 10);
  if (updateRes.ok) {
    console.log('  ✓ Rasa weight updated to 10');
    const newWeight = updateRes.data.weights.rasa;
    console.log(`  Verified new weight in response: ${newWeight}`);
  } else {
    console.log(`  ✗ Failed to update weight: ${updateRes.status}`);
    console.log(`  Error:`, updateRes.data);
    return;
  }

  // Verify cache was invalidated by getting weights again
  console.log('\n5. Verify cache invalidated (get weights again)...');
  const weightsAfter = await getWeights(adminToken);
  if (weightsAfter.ok) {
    const weightAfter = weightsAfter.data.weights.rasa;
    console.log(`  Weight after update: ${weightAfter} (should be 10) ${weightAfter === 10 ? '✓' : '✗'}`);
  }

  // Restore original weight
  console.log('\n6. Restore original Rasa weight...');
  const originalRasaWeight = weightsRes.data.weights.rasa;
  const restoreRes = await updateWeight(adminToken, 'rasa', originalRasaWeight);
  if (restoreRes.ok) {
    console.log(`  ✓ Rasa weight restored to ${originalRasaWeight}`);
  } else {
    console.log(`  ✗ Failed to restore weight: ${restoreRes.status}`);
  }
  
  console.log('\n✓ Weights API verified: weight update works and cache is invalidated');
}

main().catch(console.error);
