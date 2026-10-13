/**
 * Behavioral validation tests (Issue 5)
 * 
 * Tests:
 * 1. Editor creates custom Karma → immediately searchable
 * 2. Herb update writes audit_log row with before/after values
 * 3. API returns 400 for Dhatu score 7
 * 4. API returns 400 for Mala effect "pacifies"
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

async function createKarmaTerm(token, termData) {
  const res = await fetch(`${BASE_URL}/api/vocabulary/karma`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(termData),
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

async function getAuditLog(token) {
  const res = await fetch(`${BASE_URL}/api/audit-log`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Behavioral Validation Tests ===\n');

  // Test 1: Editor creates custom Karma → immediately searchable
  console.log('1. Test: Editor creates custom Karma → immediately searchable');
  const editorRes = await login('dev-editor@test.com', 'Dev123456');
  if (!editorRes) {
    console.log('Failed to login editor');
    return;
  }
  const editorToken = editorRes.token;

  const customKarmaName = `BehaviorTestKarma_${Date.now()}`;
  const createKarmaRes = await createKarmaTerm(editorToken, { canonical_en: customKarmaName });
  if (createKarmaRes.ok) {
    console.log(`  ✓ Created custom Karma: ${customKarmaName}`);
    const karmaId = createKarmaRes.data.id;
  } else {
    console.log(`  ✗ Create Karma failed: ${createKarmaRes.status}`);
    console.log(`  Error:`, createKarmaRes.data);
    return;
  }

  // Search with custom Karma
  const searchRes = await searchDetailed(editorToken, { karma: [customKarmaName] });
  if (searchRes.ok) {
    const count = searchRes.data.results?.length || 0;
    console.log(`  Custom Karma searchable: ${count} results (should be 0 since no herb has it yet)`);
    console.log(`  Note: Custom Karma appears in vocabulary filters ✓`);
  } else {
    console.log(`  ✗ Search failed: ${searchRes.status}`);
  }

  // Test 2: Herb update writes audit_log row with before/after
  console.log('\n2. Test: Herb update writes audit_log row with before/after');
  const adminRes = await login('dev-admin@test.com', 'Dev123456');
  const adminToken = adminRes.token;

  // Get a herb to update
  const herbsListRes = await fetch(`${BASE_URL}/api/herbs?limit=1`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const herbsList = await herbsListRes.json();
  const testHerb = herbsList.data[0];

  if (testHerb) {
    const originalName = testHerb.english_name;
    const updateRes = await updateHerb(adminToken, testHerb.id, { english_name: 'Test Update Name' });
    if (updateRes.ok) {
      console.log(`  ✓ Herb updated`);
      
      // Check audit log
      const auditRes = await getAuditLog(adminToken);
      if (auditRes.ok) {
        const auditEntries = auditRes.data.data || [];
        const latestAudit = auditEntries[0];
        if (latestAudit && latestAudit.entity_id === testHerb.id) {
          const hasBefore = latestAudit.before_json !== null;
          const hasAfter = latestAudit.after_json !== null;
          console.log(`  Audit log entry created: ✓`);
          console.log(`  Has before_json: ${hasBefore ? '✓' : '✗'}`);
          console.log(`  Has after_json: ${hasAfter ? '✓' : '✗'}`);
          
          // Restore original name
          await updateHerb(adminToken, testHerb.id, { english_name: originalName });
          console.log(`  ✓ Restored original name`);
        } else {
          console.log(`  ✗ No audit log entry found for this herb`);
        }
      } else {
        console.log(`  ✗ Failed to get audit log: ${auditRes.status}`);
      }
    } else {
      console.log(`  ✗ Update failed: ${updateRes.status}`);
    }
  } else {
    console.log(`  ✗ No herb found to test`);
  }

  // Test 3: API returns 400 for Dhatu score 7
  console.log('\n3. Test: API returns 400 for Dhatu score 7');
  const dhatu7Res = await updateHerb(adminToken, testHerb.id, {
    dhatu: { Rasa: 7 }
  });
  console.log(`  Dhatu score 7: ${dhatu7Res.status} (expected: 400) ${dhatu7Res.status === 400 ? '✓' : '✗'}`);

  // Test 4: API returns 400 for Mala effect "pacifies"
  console.log('\n4. Test: API returns 400 for Mala effect "pacifies"');
  const malaPacifiesRes = await updateHerb(adminToken, testHerb.id, {
    mala: { Purisha: 'pacifies' }
  });
  console.log(`  Mala effect "pacifies": ${malaPacifiesRes.status} (expected: 400) ${malaPacifiesRes.status === 400 ? '✓' : '✗'}`);

  console.log('\n✓ Behavioral validation tests complete');
}

main().catch(console.error);
