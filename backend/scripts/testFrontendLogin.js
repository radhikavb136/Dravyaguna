/**
 * Test frontend login flow - simulates what the browser does
 */

const BASE_URL = 'http://localhost:4000';

async function testLogin() {
  console.log('Testing frontend login flow...\n');

  // Test 1: Direct API call (works via curl)
  console.log('1. Direct API call:');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev-clinician@test.com', password: 'Dev123456' }),
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: With CORS origin header (simulating browser)
  console.log('\n2. With CORS origin header:');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5174',
      },
      body: JSON.stringify({ email: 'dev-clinician@test.com', password: 'Dev123456' }),
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: With preview port origin
  console.log('\n3. With preview port origin:');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:20322',
      },
      body: JSON.stringify({ email: 'dev-clinician@test.com', password: 'Dev123456' }),
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
}

testLogin().catch(console.error);
