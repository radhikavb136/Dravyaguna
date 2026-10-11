/**
 * Test Herb Library and Herb Detail integration
 * Verify HERB_REC_0001 field by field
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

async function getHerbById(token, id) {
  const res = await fetch(`${BASE_URL}/api/herbs/${id}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function listHerbs(token) {
  const res = await fetch(`${BASE_URL}/api/herbs?limit=100`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Herb Library and Herb Detail Verification ===\n');

  // Login as clinician
  console.log('1. Login as clinician...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    return;
  }
  const clinicianToken = clinicianRes.token;
  console.log('  ✓ Clinician logged in\n');

  // Test Herb Library list
  console.log('2. Test Herb Library list...');
  const listRes = await listHerbs(clinicianToken);
  if (listRes.ok) {
    const count = listRes.data.data?.length || 0;
    console.log(`  ✓ Herb Library returns ${count} herbs (expected: 134 reviewed for clinician)`);
    
    // Find HERB_REC_0001
    const herb0001 = listRes.data.data?.find(h => h.code === 'HERB_REC_0001');
    if (herb0001) {
      console.log(`  ✓ HERB_REC_0001 found in list (id: ${herb0001.id})`);
    } else {
      console.log(`  ✗ HERB_REC_0001 not found in list`);
      console.log(`  Available codes: ${listRes.data.data?.slice(0, 5).map(h => h.code).join(', ')}`);
    }
  } else {
    console.log(`  ✗ Herb Library failed: ${listRes.status}`);
    console.log(`  Error:`, listRes.data);
    return;
  }

  // Test Herb Detail for HERB_REC_0001
  const herb0001 = listRes.data.data?.find(h => h.code === 'HERB_REC_0001');
  if (!herb0001) {
    console.log('\n✗ Cannot test Herb Detail - HERB_REC_0001 not found');
    return;
  }

  console.log('\n3. Test Herb Detail for HERB_REC_0001...');
  const detailRes = await getHerbById(clinicianToken, herb0001.id);
  
  if (detailRes.ok) {
    const herb = detailRes.data;
    console.log('  ✓ Herb Detail loaded successfully\n');
    
    console.log('4. Field-by-field verification:');
    console.log(`  Code: ${herb.code} (expected: HERB_REC_0001) ${herb.code === 'HERB_REC_0001' ? '✓' : '✗'}`);
    console.log(`  English Name: ${herb.english_name} (expected: heart leaved moon seed) ${herb.english_name === 'heart leaved moon seed' ? '✓' : '✗'}`);
    console.log(`  Botanical Name: ${herb.botanical_name} (expected: tinospora cordifolia) ${herb.botanical_name === 'tinospora cordifolia' ? '✓' : '✗'}`);
    console.log(`  Sanskrit Name: ${herb.sanskrit_name || '—'}`);
    console.log(`  Part Used: ${herb.part_used || '—'}`);
    console.log(`  Virya: ${herb.virya || '—'} (expected: Ushna) ${(herb.virya === 'Ushna') ? '✓' : '✗'}`);
    console.log(`  Vipaka: ${herb.vipaka || '—'} (expected: Madhura) ${(herb.vipaka === 'Madhura') ? '✓' : '✗'}`);
    console.log(`  Status: ${herb.status} (expected: reviewed) ${herb.status === 'reviewed' ? '✓' : '✗'}`);
    
    console.log('\n5. Array fields:');
    console.log(`  Rasa: ${herb.rasa?.join(', ') || '—'} (expected: Tikta, Kashaya)`);
    console.log(`  Guna: ${herb.guna?.join(', ') || '—'} (expected: Laghu, Snigdha)`);
    
    console.log('\n6. Dhatu (object format with scores):');
    if (herb.dhatu && typeof herb.dhatu === 'object') {
      Object.entries(herb.dhatu).forEach(([dhatu, score]) => {
        console.log(`  ${dhatu}: ${score}`);
      });
    } else {
      console.log('  — (no Dhatu data)');
    }
    
    console.log('\n7. Mala display (should show term + effect):');
    if (herb.mala && herb.mala.length > 0) {
      herb.mala.forEach(m => {
        console.log(`  ${m.mala} · ${m.effect} (format: term · effect) ✓`);
      });
    } else {
      console.log('  — (no Mala data)');
    }
    
    console.log('\n8. Dosha display (should show pacifies/increases, not raw enum):');
    if (herb.dosha_actions && Array.isArray(herb.dosha_actions)) {
      herb.dosha_actions.forEach(d => {
        const validEffect = d.effect === 'pacifies' || d.effect === 'increases';
        console.log(`  ${d.dosha}: ${d.effect} ${validEffect ? '✓' : '✗ (invalid effect)'}`);
      });
    } else if (herb.dosha_actions && typeof herb.dosha_actions === 'object') {
      Object.entries(herb.dosha_actions).forEach(([dosha, effect]) => {
        const validEffect = effect === 'pacifies' || effect === 'increases';
        console.log(`  ${dosha}: ${effect} ${validEffect ? '✓' : '✗ (invalid effect)'}`);
      });
    } else {
      console.log('  — (no Dosha data)');
    }
    
  } else {
    console.log(`  ✗ Herb Detail failed: ${detailRes.status}`);
    console.log(`  Error:`, detailRes.data);
  }
}

main().catch(console.error);
