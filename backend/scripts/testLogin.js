/**
 * Test login with API feature flag enabled
 */

const BASE_URL = 'http://localhost:4000';

async function testLogin(email, password, expectedRole) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✓ ${email} logged in as ${data.user.role} (expected: ${expectedRole})`);
      return data.token;
    } else {
      const error = await res.json();
      console.log(`✗ ${email} failed: ${error.error}`);
      return null;
    }
  } catch (error) {
    console.log(`✗ ${email} network error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Testing login with VITE_USE_API=true\n');

  // Test all four roles
  await testLogin('dev-admin@test.com', 'Dev123456', 'admin');
  await testLogin('dev-editor@test.com', 'Dev123456', 'editor');
  await testLogin('dev-expert@test.com', 'Dev123456', 'domain_expert');
  await testLogin('dev-clinician@test.com', 'Dev123456', 'clinician');

  // Test wrong password
  console.log('\nTesting wrong password...');
  await testLogin('dev-clinician@test.com', 'WrongPassword', 'should fail');

  // Test non-existent user
  console.log('\nTesting non-existent user...');
  await testLogin('nonexistent@test.com', 'Dev123456', 'should fail');
}

main().catch(console.error);
