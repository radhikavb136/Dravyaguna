/**
 * Acceptance Test 2 — role enforcement and protected routes (isolated 54334 + API 4010).
 */
import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, DEV_USERS } from '../helpers/api.js';
import { USERS_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const apiURL = process.env.E2E_API_URL || 'http://localhost:4010';
const SUPPORT_ADMIN_TITLE = /support requests|सहायता अनुरोध|समर्थन विनंत्या|समर्थनानुरोधाः/i;

test.describe('Acceptance 2 — role enforcement', () => {
  test('Test A — unauthenticated access', async ({ page }) => {
    const diag = attachPageDiagnostics(page);

    await test.step('A1–A2. Clear session and open /herb-library', async () => {
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/herb-library');
    });

    await test.step('A3. Redirect to /auth', async () => {
      await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    });

    await test.step('A4. Protected API returns 401 without token', async () => {
      const herbs = await fetch(`${apiURL}/api/herbs?limit=1`, {
        headers: { Accept: 'application/json' },
      });
      expect(herbs.status).toBe(401);
      const users = await fetch(`${apiURL}/api/users`, {
        headers: { Accept: 'application/json' },
      });
      expect(users.status).toBe(401);
      const body = await herbs.json().catch(() => ({}));
      expect(String(body.error || '').toLowerCase()).toMatch(/auth/);
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });

  test('Test B — clinician restrictions', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    let clinicianToken = '';

    await test.step('B1. Log in as clinician', async () => {
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await loginViaUi(page, 'clinician');
      clinicianToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(clinicianToken).toBeTruthy();
    });

    await test.step('B2. /admin/users denied', async () => {
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });
      await expect(page).not.toHaveURL(/\/admin\/users/);
    });

    await test.step('B3–B4. /admin/support-requests denied', async () => {
      await page.goto('/admin/support-requests');
      await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });
    });

    await test.step('B5–B6. Admin APIs return 403 for clinician', async () => {
      const users = await apiRequest(clinicianToken, 'GET', '/api/users');
      expect(users.status).toBe(403);

      const supportList = await apiRequest(clinicianToken, 'GET', '/api/support/requests?limit=5');
      expect(supportList.status).toBe(403);

      const audit = await apiRequest(clinicianToken, 'GET', '/api/audit-log');
      expect(audit.status).toBe(403);
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });

  test('Test C — admin access', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    let adminToken = '';

    await test.step('C1–C2. Log in as seeded admin', async () => {
      await page.goto('/auth', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      const login = await apiLogin(DEV_USERS.admin);
      expect(login.token).toBeTruthy();
      adminToken = login.token;
      await loginViaUi(page, 'admin');
      await expect(page).toHaveURL(/\/admin/);
    });

    await test.step('C3–C4. /admin/users loads with authorized API', async () => {
      const usersGet = page.waitForResponse(
        (r) => r.url().includes('/api/users') && r.request().method() === 'GET' && r.ok(),
        { timeout: 20_000 }
      );
      await page.goto('/admin/users');
      const res = await usersGet;
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { name: USERS_TITLE })).toBeVisible({ timeout: 15_000 });

      const apiUsers = await apiRequest(adminToken, 'GET', '/api/users');
      expect(apiUsers.status).toBe(200);
      expect(Array.isArray(apiUsers.data?.data || apiUsers.data)).toBeTruthy();
    });

    await test.step('C3–C4. /admin/support-requests loads with authorized API', async () => {
      const supportGet = page.waitForResponse(
        (r) =>
          r.url().includes('/api/support/requests') &&
          !r.url().includes('/mine') &&
          r.request().method() === 'GET' &&
          r.ok(),
        { timeout: 20_000 }
      );
      await page.goto('/admin/support-requests');
      await supportGet;
      await expect(page.getByRole('heading', { name: SUPPORT_ADMIN_TITLE })).toBeVisible({
        timeout: 15_000,
      });

      const apiSupport = await apiRequest(adminToken, 'GET', '/api/support/requests?limit=5');
      expect(apiSupport.status).toBe(200);
      expect(apiSupport.data?.data).toBeDefined();
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
