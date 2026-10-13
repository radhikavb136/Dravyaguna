/**
 * Test weights against Excel-derived numbers
 * Verify Rasa=Tikta + Virya=Ushna search returns 63 herbs at 100%
 * Verify HERB_REC_0010 (Tikta only) and HERB_REC_0023 (Ushna only) match calculations
 * Then double Rasa weight and verify next search reflects it
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

async function getHerbByCode(token, code) {
  const res = await fetch(`${BASE_URL}/api/herbs?limit=200`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data.find(h => h.code === code);
}

async function main() {
  console.log('=== Weights Excel-Derived Verification ===\n');

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
  const weights = weightsRes.data.weights;
  const w_rasa = weights.rasa;
  const w_virya = weights.virya;
  console.log(`  Rasa weight: ${w_rasa}`);
  console.log(`  Virya weight: ${w_virya}`);
  console.log(`  Tikta + Ushna expected calculation: herb with only Tikta = ${w_rasa}/(${w_rasa}+${w_virya}) = ${(w_rasa/(w_rasa+w_virya)*100).toFixed(1)}%`);
  console.log(`  Tikta + Ushna expected calculation: herb with only Ushna = ${w_virya}/(${w_rasa}+${w_virya}) = ${(w_virya/(w_rasa+w_virya)*100).toFixed(1)}%\n`);

  // Login as clinician for search
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;

  // Search Rasa=Tikta + Virya=Ushna
  console.log('3. Search Rasa=Tikta + Virya=Ushna (expected: 108 total, 63 at 100%)...');
  const searchRes = await searchDetailed(clinicianToken, { rasa: ['Tikta'], virya: ['Ushna'] });
  if (searchRes.ok) {
    const count = searchRes.data.results?.length || 0;
    const count100 = searchRes.data.results?.filter(r => r.matchPercentage === 100).length || 0;
    console.log(`  Total results: ${count} (expected: 108) ${count === 108 ? '✓' : '✗'}`);
    console.log(`  100% matches: ${count100} (expected: 63) ${count100 === 63 ? '✓' : '✗'}`);
    
    // Find HERB_REC_0010 (Tikta + Sheeta, not Ushna)
    const herb0010 = searchRes.data.results?.find(h => h.code === 'HERB_REC_0010');
    if (herb0010) {
      const matchPercent = herb0010.matchPercentage;
      const expectedPercent = (w_rasa / (w_rasa + w_virya)) * 100;
      console.log(`  HERB_REC_0010 (Tikta only): ${matchPercent}% (expected: ${expectedPercent.toFixed(1)}%) ${Math.abs(matchPercent - expectedPercent) < 0.1 ? '✓' : '✗'}`);
    } else {
      console.log('  HERB_REC_0010 not in search results (has Sheeta, not Ushna)');
    }
    
    // Find HERB_REC_0023 (Ushna + Madhura + Amla, not Tikta)
    const herb0023 = searchRes.data.results?.find(h => h.code === 'HERB_REC_0023');
    if (herb0023) {
      const matchPercent = herb0023.matchPercentage;
      const expectedPercent = (w_virya / (w_rasa + w_virya)) * 100;
      console.log(`  HERB_REC_0023 (Ushna only): ${matchPercent}% (expected: ${expectedPercent.toFixed(1)}%) ${Math.abs(matchPercent - expectedPercent) < 0.1 ? '✓' : '✗'}`);
    } else {
      console.log('  HERB_REC_0023 not in search results (has Madhura+Amla+Ushna, not Tikta)');
    }
  } else {
    console.log(`  ✗ Search failed: ${searchRes.status}`);
    return;
  }

  // Double Rasa weight
  console.log('\n6. Double Rasa weight...');
  const newRasaWeight = w_rasa * 2;
  const updateRes = await updateWeight(adminToken, 'rasa', newRasaWeight);
  if (updateRes.ok) {
    console.log(`  ✓ Rasa weight updated to ${newRasaWeight}`);
  } else {
    console.log(`  ✗ Failed to update weight: ${updateRes.status}`);
    return;
  }

  // Search again to verify cache invalidation
  console.log('\n7. Search again (should reflect new weight immediately)...');
  const afterSearch = await searchDetailed(clinicianToken, { rasa: ['Tikta'], virya: ['Ushna'] });
  if (afterSearch.ok) {
    const count = afterSearch.data.results?.length || 0;
    console.log(`  Results: ${count} herbs`);
    
    // Check HERB_REC_0010 again
    const herb0010After = afterSearch.data.results?.find(h => h.code === 'HERB_REC_0010');
    if (herb0010After) {
      const matchPercent = herb0010After.matchPercentage;
      const expectedPercent = (newRasaWeight / (newRasaWeight + w_virya)) * 100;
      console.log(`  HERB_REC_0010: ${matchPercent}% (expected: ${expectedPercent.toFixed(1)}%) ${Math.abs(matchPercent - expectedPercent) < 0.1 ? '✓' : '✗'}`);
    }
    
    // Check HERB_REC_0023 again
    const herb0023After = afterSearch.data.results?.find(h => h.code === 'HERB_REC_0023');
    if (herb0023After) {
      const matchPercent = herb0023After.matchPercentage;
      const expectedPercent = (w_virya / (newRasaWeight + w_virya)) * 100;
      console.log(`  HERB_REC_0023: ${matchPercent}% (expected: ${expectedPercent.toFixed(1)}%) ${Math.abs(matchPercent - expectedPercent) < 0.1 ? '✓' : '✗'}`);
    }
  }

  // Restore original weight
  console.log('\n8. Restore original Rasa weight...');
  const restoreRes = await updateWeight(adminToken, 'rasa', w_rasa);
  if (restoreRes.ok) {
    console.log(`  ✓ Rasa weight restored to ${w_rasa}`);
  }

  console.log('\n✓ Weights Excel-derived verification complete');
}

main().catch(console.error);
