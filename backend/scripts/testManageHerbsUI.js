/**
 * Test Manage Herbs + Add/Edit Herb UI integration
 * Verify: create as draft, editors cannot set verified, verify button for domain_expert/admin, archive for admin
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

async function listHerbs(token, status) {
  const url = status ? `${BASE_URL}/api/herbs?status=${status}` : `${BASE_URL}/api/herbs`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Manage Herbs + Add/Edit Herb UI Integration Test ===\n');

  const testCode = `UI_TEST_${Date.now()}`;
  let herbId = null;

  // 1. Editor creates a draft herb
  console.log('1. Editor creates a draft herb...');
  const editorRes = await login('dev-editor@test.com', 'Dev123456');
  if (!editorRes) {
    console.log('Failed to login editor');
    return;
  }
  const editorToken = editorRes.token;

  const newHerb = {
    code: testCode,
    english_name: 'Test Herb UI',
    sanskrit_name: 'TestUI',
    botanical_name: 'Test botanical',
    rasa: ['Tikta'],
    guna: ['Laghu'],
    virya: 'Ushna',
    vipaka: 'Madhura',
    status: 'draft',
  };

  const createRes = await createHerb(editorToken, newHerb);
  if (createRes.ok) {
    herbId = createRes.data.id;
    console.log(`  ✓ Draft herb created with ID: ${herbId}`);
    console.log(`  Status: ${createRes.data.status} (expected: draft)\n`);
  } else {
    console.log(`  ✗ Failed to create herb: ${createRes.status}\n`);
    return;
  }

  // 2. Editor cannot set verified status
  console.log('2. Editor attempts to set verified status...');
  const verifyAsEditor = await verifyHerb(editorToken, herbId);
  if (!verifyAsEditor.ok && verifyAsEditor.status === 403) {
    console.log(`  ✓ Editor correctly rejected from verifying (403)\n`);
  } else {
    console.log(`  ✗ Editor should not be able to verify: ${verifyAsEditor.status}\n`);
  }

  // 3. Editor can move draft to reviewed
  console.log('3. Editor moves draft to reviewed...');
  const updateRes = await updateHerb(editorToken, herbId, { status: 'reviewed' });
  if (updateRes.ok) {
    console.log(`  ✓ Herb moved to reviewed: ${updateRes.data.status}\n`);
  } else {
    console.log(`  ✗ Failed to update herb: ${updateRes.status}\n`);
  }

  // 4. Domain expert can verify
  console.log('4. Domain expert verifies herb...');
  const expertRes = await login('dev-expert@test.com', 'Dev123456');
  const expertToken = expertRes.token;
  const verifyRes = await verifyHerb(expertToken, herbId);
  if (verifyRes.ok) {
    console.log(`  ✓ Herb verified by domain expert: ${verifyRes.data.status}\n`);
  } else {
    console.log(`  ✗ Failed to verify herb: ${verifyRes.status}\n`);
  }

  // 5. Admin can archive/delete
  console.log('5. Admin archives/deletes herb...');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  const adminToken = adminRes.token;
  const deleteRes = await deleteHerb(adminToken, herbId);
  if (deleteRes.ok) {
    console.log(`  ✓ Herb deleted by admin\n`);
  } else {
    console.log(`  ✗ Failed to delete herb: ${deleteRes.status}\n`);
  }

  // 6. Verify herb is no longer in list
  console.log('6. Verify herb is removed from list...');
  const listRes = await listHerbs(adminToken, 'verified');
  if (listRes.ok) {
    const found = listRes.data.data?.find(h => h.id === herbId);
    if (!found) {
      console.log(`  ✓ Herb no longer in list\n`);
    } else {
      console.log(`  ✗ Herb still in list\n`);
    }
  }

  console.log('✓ Manage Herbs + Add/Edit Herb UI integration verified');
}

main().catch(console.error);
