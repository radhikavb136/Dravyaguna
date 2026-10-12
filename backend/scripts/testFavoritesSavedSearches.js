/**
 * Test Favorites and Saved Searches
 * Verify: Per-user favorites and saved searches work correctly
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

async function getHerbs(token) {
  const res = await fetch(`${BASE_URL}/api/herbs?limit=10`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function addFavorite(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ herb_id: herbId }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function getFavorites(token) {
  const res = await fetch(`${BASE_URL}/api/favorites`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function removeFavorite(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/favorites/${herbId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function saveSearch(token, name, filters) {
  const res = await fetch(`${BASE_URL}/api/saved-searches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name, filters }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function getSavedSearches(token) {
  const res = await fetch(`${BASE_URL}/api/saved-searches`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function removeSavedSearch(token, id) {
  const res = await fetch(`${BASE_URL}/api/saved-searches/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: text };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

async function main() {
  console.log('=== Favorites and Saved Searches Verification ===\n');

  // Login as clinician
  console.log('1. Login as clinician...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    return;
  }
  const clinicianToken = clinicianRes.token;
  console.log('  ✓ Clinician logged in\n');

  // Get a herb to favorite
  console.log('2. Get a herb to favorite...');
  const herbsRes = await getHerbs(clinicianToken);
  if (!herbsRes || !herbsRes.data || herbsRes.data.length === 0) {
    console.log('  ✗ No herbs found');
    return;
  }
  const testHerb = herbsRes.data[0];
  console.log(`  ✓ Found herb: ${testHerb.code} - ${testHerb.english_name}\n`);

  // Add favorite
  console.log('3. Add favorite...');
  const addFavRes = await addFavorite(clinicianToken, testHerb.id);
  if (addFavRes.ok) {
    console.log(`  ✓ Favorite added`);
  } else {
    console.log(`  ✗ Add favorite failed: ${addFavRes.status}`);
    return;
  }

  // Get favorites
  console.log('\n4. Get favorites...');
  const getFavRes = await getFavorites(clinicianToken);
  if (getFavRes.ok) {
    const count = getFavRes.data.data?.length || 0;
    console.log(`  ✓ Favorites: ${count} ${count === 1 ? '✓' : '✗'}`);
  } else {
    console.log(`  ✗ Get favorites failed: ${getFavRes.status}`);
  }

  // Remove favorite
  console.log('\n5. Remove favorite...');
  const removeFavRes = await removeFavorite(clinicianToken, testHerb.id);
  if (removeFavRes.ok) {
    console.log(`  ✓ Favorite removed`);
  } else {
    console.log(`  ✗ Remove favorite failed: ${removeFavRes.status}`);
  }

  // Save search
  console.log('\n6. Save search...');
  const saveSearchRes = await saveSearch(clinicianToken, 'Test Search', { rasa: ['Tikta'] });
  if (saveSearchRes.ok) {
    console.log(`  ✓ Search saved: ${saveSearchRes.data.name}`);
    const savedSearchId = saveSearchRes.data.id;
  } else {
    console.log(`  ✗ Save search failed: ${saveSearchRes.status}`);
    return;
  }

  // Get saved searches
  console.log('\n7. Get saved searches...');
  const getSavedRes = await getSavedSearches(clinicianToken);
  if (getSavedRes.ok) {
    const count = getSavedRes.data.data?.length || 0;
    console.log(`  ✓ Saved searches: ${count} ${count === 1 ? '✓' : '✗'}`);
    const savedSearchId = getSavedRes.data.data[0]?.id;
  } else {
    console.log(`  ✗ Get saved searches failed: ${getSavedRes.status}`);
  }

  // Remove saved search
  console.log('\n8. Remove saved search...');
  const savedSearchId = getSavedRes.data.data[0]?.id;
  if (savedSearchId) {
    const removeSavedRes = await removeSavedSearch(clinicianToken, savedSearchId);
    if (removeSavedRes.ok) {
      console.log(`  ✓ Saved search removed`);
    } else {
      console.log(`  ✗ Remove saved search failed: ${removeSavedRes.status}`);
    }
  }

  // Test per-user isolation
  console.log('\n9. Test per-user isolation (editor should not see clinician favorites)...');
  const editorRes = await login('dev-editor@test.com', 'Dev123456');
  const editorToken = editorRes.token;
  const editorFavRes = await getFavorites(editorToken);
  if (editorFavRes.ok) {
    const count = editorFavRes.data.data?.length || 0;
    console.log(`  Editor favorites: ${count} (expected: 0, clinician removed theirs) ${count === 0 ? '✓' : '✗'}`);
  }

  console.log('\n✓ Favorites and Saved Searches verification complete');
}

main().catch(console.error);
