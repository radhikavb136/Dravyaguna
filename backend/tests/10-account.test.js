import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens, login } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const stamp = Date.now();
  const email = `zz_test_account_${stamp}@example.com`;
  const password = 'AccountPass1234';

  const unauthenticated = await api('GET', '/api/account');
  assertEqual(unauthenticated.status, 401, 'account endpoint requires authentication');

  const created = await api('POST', '/api/users', {
    token: tokens.admin,
    body: { email, password, fullName: 'ZZ Account User', role: 'admin' },
  });
  assertEqual(created.status, 201, 'admin creates account test user');

  const session = await login(email, password);
  assert(session.ok, 'test account login');
  const token = session.data.token;

  const loaded = await api('GET', '/api/account', { token });
  assertEqual(loaded.status, 200, 'account profile loads');
  assertEqual(loaded.data.data.role, 'admin', 'account role comes from the database');

  const profile = await api('PATCH', '/api/account/profile', {
    token,
    body: { fullName: 'ZZ Account Updated', displayName: 'Account Alias' },
  });
  assertEqual(profile.status, 200, 'profile update');
  const reloaded = await api('GET', '/api/account', { token });
  assertEqual(reloaded.data.data.full_name, 'ZZ Account Updated', 'name persists after reload');
  assertEqual(reloaded.data.data.email, email, 'self profile edit does not change login email');

  const preferences = await api('PATCH', '/api/account/preferences', {
    token,
    body: {
      language: 'mr-IN',
      preferences: {
        showAnalytics: false,
        confirmBeforeDelete: false,
        defaultSearch: 'detailed',
        resultsPerPage: 50,
        showMatchPercentage: false,
      },
    },
  });
  assertEqual(preferences.status, 200, 'preference update');
  const loadedPreferences = await api('GET', '/api/account', { token });
  assertEqual(loadedPreferences.data.data.preferred_language, 'mr-IN', 'language persists after reload');
  assertEqual(loadedPreferences.data.data.preferences.showAnalytics, false, 'settings persist after reload');
  assertEqual(loadedPreferences.data.data.preferences.defaultSearch, 'detailed', 'search preference persists after reload');
  assertEqual(loadedPreferences.data.data.preferences.resultsPerPage, 50, 'page size persists after reload');

  const invalidPreference = await api('PATCH', '/api/account/preferences', {
    token,
    body: { language: 'xx-XX' },
  });
  assertEqual(invalidPreference.status, 400, 'unsupported language rejected');

  const badPassword = await api('POST', '/api/account/password', {
    token,
    body: { currentPassword: 'incorrect', newPassword: 'NewAccountPass123' },
  });
  assertEqual(badPassword.status, 400, 'incorrect current password rejected');

  const changedPassword = await api('POST', '/api/account/password', {
    token,
    body: { currentPassword: password, newPassword: 'NewAccountPass123' },
  });
  assertEqual(changedPassword.status, 200, 'password changed');
  assertEqual((await login(email, 'NewAccountPass123')).status, 200, 'new password works');
}
