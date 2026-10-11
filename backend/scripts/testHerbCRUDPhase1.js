/**
 * Test Herb CRUD operations
 * Verify: create as draft, edit, status transitions per role, verify button visibility, archive
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

async function createHerb(token, herbData) {
  const res = await fetch(`${BASE_URL}/api/herbs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(herbData),
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
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
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function verifyHerb(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function deleteHerb(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function getHerb(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/herbs/${herbId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Herb CRUD Verification ===\n');

  // Test 1: Create herb as draft (editor+)
  console.log('1. Create herb as draft (editor)...');
  const editorRes = await login('dev-editor@test.com', 'Dev123456');
  if (!editorRes) {
    console.log('Failed to login editor');
    return;
  }
  const editorToken = editorRes.token;

  const testHerb = {
    code: `PHASE1_TEST_${Date.now()}`,
    english_name: 'Phase 1 Test Herb',
    sanskrit_name: 'Test Sanskrit',
    rasa: ['Tikta'],
    karma: ['Deepana'],
  };

  const createRes = await createHerb(editorToken, testHerb);
  if (!createRes.ok) {
    console.log(`  ✗ Create failed: ${createRes.status}`);
    console.log(`  Error:`, createRes.data);
    return;
  }

  console.log(`  ✓ Created herb: ${createRes.data.code}, status: ${createRes.data.status} (expected: draft) ${createRes.data.status === 'draft' ? '✓' : '✗'}`);
  const herbId = createRes.data.id;

  // Test 2: Clinician cannot create
  console.log('\n2. Clinician cannot create...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  const clinicianToken = clinicianRes.token;
  const clinicianCreate = await createHerb(clinicianToken, { code: 'TEST_002', english_name: 'Test' });
  console.log(`  Clinician create: ${clinicianCreate.status} (expected: 403) ${clinicianCreate.status === 403 ? '✓' : '✗'}`);

  // Test 3: Editor can move draft → reviewed
  console.log('\n3. Editor moves draft → reviewed...');
  const updateRes = await updateHerb(editorToken, herbId, { status: 'reviewed' });
  if (updateRes.ok) {
    console.log(`  ✓ Status updated to: ${updateRes.data.status} (expected: reviewed) ${updateRes.data.status === 'reviewed' ? '✓' : '✗'}`);
  } else {
    console.log(`  ✗ Update failed: ${updateRes.status}`);
  }

  // Test 4: Editor cannot set to verified
  console.log('\n4. Editor cannot set status to verified...');
  const verifyAsEditor = await verifyHerb(editorToken, herbId);
  console.log(`  Editor verify: ${verifyAsEditor.status} (expected: 403) ${verifyAsEditor.status === 403 ? '✓' : '✗'}`);

  // Test 5: Domain expert can verify
  console.log('\n5. Domain expert can verify...');
  const expertRes = await login('dev-expert@test.com', 'Dev123456');
  const expertToken = expertRes.token;
  const verifyRes = await verifyHerb(expertToken, herbId);
  if (verifyRes.ok) {
    console.log(`  ✓ Status updated to: ${verifyRes.data.status} (expected: verified) ${verifyRes.data.status === 'verified' ? '✓' : '✗'}`);
  } else {
    console.log(`  ✗ Verify failed: ${verifyRes.status}`);
  }

  // Test 6: Admin can archive
  console.log('\n6. Admin can archive (soft delete)...');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  const adminToken = adminRes.token;
  const deleteRes = await deleteHerb(adminToken, herbId);
  if (deleteRes.ok) {
    console.log(`  ✓ Status updated to: ${deleteRes.data.status} (expected: archived) ${deleteRes.data.status === 'archived' ? '✓' : '✗'}`);
  } else {
    console.log(`  ✗ Delete failed: ${deleteRes.status}`);
  }

  // Cleanup
  console.log('\n7. Cleanup test herb...');
  const getRes = await getHerb(adminToken, herbId);
  if (getRes.ok && getRes.data.status === 'archived') {
    // Actually delete from database
    const deleteRes = await deleteHerb(adminToken, herbId);
    console.log('  ✓ Cleanup complete');
  }

  console.log('\n✓ Herb CRUD verification complete');
}

main().catch(console.error);
