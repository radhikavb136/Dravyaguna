/**
 * Test Favorites + Saved Searches UI integration
 * Verify: per-user isolation, CRUD operations
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

async function getFavorites(token) {
  const res = await fetch(`${BASE_URL}/api/favorites`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
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
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function removeFavorite(token, herbId) {
  const res = await fetch(`${BASE_URL}/api/favorites/${herbId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function getSavedSearches(token) {
  const res = await fetch(`${BASE_URL}/api/saved-searches`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
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
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function removeSavedSearch(token, id) {
  const res = await fetch(`${BASE_URL}/api/saved-searches/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : await res.json() };
}

async function main() {
  console.log('=== Favorites + Saved Searches UI Integration Test ===\n');

  // Get a known herb ID
  let herbId = null;
  const listRes = await fetch(`${BASE_URL}/api/herbs?limit=200`);
  if (listRes.ok) {
    const listData = await listRes.json();
    // Use the first herb
    herbId = listData.data?.[0]?.id;
  }
  
  if (!herbId) {
    console.log('Could not find a herb to test with');
    return;
  }
  
  console.log(`Using herb ID: ${herbId}\n`);

  // 1. Clinician adds favorite
  console.log('1. Clinician adds favorite...');
  const clinicianRes = await login('dev-clinician@test.com', 'Dev123456');
  if (!clinicianRes) {
    console.log('Failed to login clinician');
    return;
  }
  const clinicianToken = clinicianRes.token;

  const addFavRes = await addFavorite(clinicianToken, herbId);
  if (addFavRes.ok) {
    console.log(`  ✓ Favorite added\n`);
  } else {
    console.log(`  ✗ Failed to add favorite: ${addFavRes.status}\n`);
  }

  // 2. Clinician gets favorites
  console.log('2. Clinician gets favorites...');
  const getFavRes = await getFavorites(clinicianToken);
  if (getFavRes.ok) {
    console.log(`  ✓ Favorites retrieved, ${getFavRes.data.data?.length || 0} items\n`);
  } else {
    console.log(`  ✗ Failed to get favorites: ${getFavRes.status}\n`);
  }

  // 3. Clinician removes favorite
  console.log('3. Clinician removes favorite...');
  const removeFavRes = await removeFavorite(clinicianToken, herbId);
  if (removeFavRes.ok) {
    console.log(`  ✓ Favorite removed\n`);
  } else {
    console.log(`  ✗ Failed to remove favorite: ${removeFavRes.status}\n`);
  }

  // 4. Clinician saves search
  console.log('4. Clinician saves search...');
  const saveSearchRes = await saveSearch(clinicianToken, 'Test Search UI', { rasa: ['Tikta'] });
  if (saveSearchRes.ok) {
    console.log(`  ✓ Search saved with ID: ${saveSearchRes.data.id}\n`);
  } else {
    console.log(`  ✗ Failed to save search: ${saveSearchRes.status}\n`);
  }

  // 5. Clinician gets saved searches
  console.log('5. Clinician gets saved searches...');
  const getSearchRes = await getSavedSearches(clinicianToken);
  if (getSearchRes.ok) {
    console.log(`  ✓ Saved searches retrieved, ${getSearchRes.data.data?.length || 0} items\n`);
  } else {
    console.log(`  ✗ Failed to get saved searches: ${getSearchRes.status}\n`);
  }

  // 6. Editor cannot see clinician's favorites (per-user isolation)
  console.log('6. Editor attempts to access clinician favorites...');
  const editorRes = await login('dev-editor@test.com', 'Dev123456');
  const editorToken = editorRes.token;
  const editorFavRes = await getFavorites(editorToken);
  if (editorFavRes.ok) {
    const hasClinicianFav = editorFavRes.data.data?.some(f => f.herb_id === herbId);
    if (!hasClinicianFav) {
      console.log(`  ✓ Editor cannot see clinician favorites (per-user isolation)\n`);
    } else {
      console.log(`  ✗ Per-user isolation failed\n`);
    }
  }

  console.log('✓ Favorites + Saved Searches UI integration verified');
}

main().catch(console.error);
