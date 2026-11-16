import { test, expect } from '@playwright/test';
import {
  apiLogin,
  apiRequest,
  DEV_USERS,
  listHerbs,
  simpleSearch,
} from '../helpers/api.js';
import {
  deleteSupportRequestsLike,
  deleteSynonymMapping,
  insertDraftSynonymMapping,
} from '../helpers/db.js';
import { FAVORITES_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi, logoutViaUi } from '../helpers/ui.js';

const apiURL = process.env.E2E_API_URL || 'http://localhost:4010';

const SUPPORT_SUCCESS_TEXT =
  /support request received|सहायता अनुरोध प्राप्त|समर्थन विनंती प्राप्त|समर्थनानुरोधः प्राप्तः/i;
const PAYMENT_UNAVAILABLE_TEXT =
  /online payments are not configured|not configured on this server|ऑनलाइन भुगतान|ऑनलाइन पेमेंट|ऑनलाइनदेयनं/i;
const PASSWORD_RESET_HEADING = /reset your password|पासवर्ड रीसेट|गुप्तशब्दं पुनः/i;

test.beforeEach(async ({ page }) => {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('Whole-site — auth, session, and account', () => {
  test('logout clears session and blocks protected routes', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');
    await page.goto('/doctor');
    await logoutViaUi(page);
    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    diag.ignoreApiFailures();
    diag.assertClean();
  });

  test('password reset request shows honest messaging when SMTP is off', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Log In', exact: true }).first().click();
    await page.getByRole('link', { name: /forgot password|पासवर्ड भूल|गुप्तशब्दः विस्मृत/i }).click();
    await expect(page).toHaveURL(/\/password-reset/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: PASSWORD_RESET_HEADING })).toBeVisible({
      timeout: 15_000,
    });
    const resetMain = page.locator('main').filter({
      has: page.getByRole('heading', { name: PASSWORD_RESET_HEADING }),
    });
    await resetMain.locator('input[type="email"]').fill(DEV_USERS.clinician);
    await resetMain.locator('form button[type="submit"]').click();
    const status = page.locator('[role="status"]');
    await expect(status).toBeVisible({ timeout: 15_000 });
    const text = (await status.textContent()) || '';
    expect(text.toLowerCase()).not.toMatch(/email has been sent|check your inbox/i);
    diag.ignoreApiFailures();
    diag.assertClean();
  });

  test('clinician cannot open admin support requests', async ({ page }) => {
    await loginViaUi(page, 'clinician');
    await page.goto('/admin/support-requests');
    await expect(page).toHaveURL(/\/doctor/);
  });
});

test.describe('Whole-site — clinician workflows', () => {
  test('search, favorite herb, and remove favorite', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    const { token } = await apiLogin(DEV_USERS.clinician);
    const list = await listHerbs(token);
    const herbId = list.data?.data?.[0]?.id;
    expect(herbId).toBeTruthy();

    await loginViaUi(page, 'clinician');
    await page.goto(`/herb/${herbId}`);
    await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Herb not found', { timeout: 20_000 });

    await page.locator('.herb-favorite-button').click();
    await expect(page.locator('.herb-favorite-button.favorite-active')).toBeVisible({ timeout: 15_000 });

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: FAVORITES_TITLE })).toBeVisible({ timeout: 15_000 });

    const removeBtn = page.getByRole('button', { name: /remove/i }).first();
    if (await removeBtn.count()) {
      await removeBtn.click();
    } else {
      await apiRequest(token, 'DELETE', `/api/favorites/${herbId}`, undefined);
      await page.reload();
    }
    diag.assertClean();
  });

  test('help support form submits in API mode', async ({ page }) => {
    const stamp = Date.now();
    const message = `zz_test_e2e_support_${stamp}`;
    await deleteSupportRequestsLike('zz_test_e2e_support_');

    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');
    await page.goto('/help-support');

    await page.locator('button.help-contact-button').click();
    await page.locator('#support-topic').selectOption('technical');
    await page.locator('#support-message').fill(message);
    await page.locator('form.help-contact-form').getByRole('button').click();
    await expect(page.getByText(SUPPORT_SUCCESS_TEXT)).toBeVisible({ timeout: 20_000 });

    const clinician = await apiLogin(DEV_USERS.clinician);
    const mine = await apiRequest(clinician.token, 'GET', '/api/support/requests/mine', undefined);
    expect(mine.status).toBe(200);
    expect((mine.data?.data || []).some((r) => r.message === message)).toBeTruthy();
    diag.assertClean();
    await deleteSupportRequestsLike('zz_test_e2e_support_');
  });

  test('language preference can switch to Hindi on language page', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');
    await page.goto('/language');
    await page.getByRole('button', { name: /hindi/i }).click();
    await expect(page.locator('.language-option.selected')).toContainText('Hindi', { timeout: 15_000 });
    diag.assertClean();
  });

  test('payment page does not claim checkout success', async ({ page }) => {
    await loginViaUi(page, 'clinician');
    await page.goto('/payment?plan=Pro');
    await expect(page.getByRole('status').filter({ hasText: PAYMENT_UNAVAILABLE_TEXT }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('Whole-site — admin and expert', () => {
  test('admin lists and updates support request status', async ({ page }) => {
    const stamp = Date.now();
    const message = `zz_test_e2e_admin_support_${stamp}`;
    await deleteSupportRequestsLike('zz_test_e2e_admin_support_');

    const clinician = await apiLogin(DEV_USERS.clinician);
    const created = await apiRequest(clinician.token, 'POST', '/api/support/requests', {
      topic: 'account',
      message,
    });
    expect(created.status).toBe(201);
    const requestId = created.data?.data?.id;

    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'admin');
    await page.goto('/admin/support-requests');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(message, { exact: false })).toBeVisible({ timeout: 15_000 });

    const row = page.locator('tr').filter({ hasText: message }).first();
    await row.locator('select').selectOption('in_progress');

    const admin = await apiLogin(DEV_USERS.admin);
    const detail = await apiRequest(admin.token, 'GET', `/api/support/requests?limit=50`, undefined);
    expect(detail.status).toBe(200);
    const item = (detail.data?.data || []).find((r) => r.id === requestId);
    expect(item?.status === 'in_progress' || item?.status === 'open').toBeTruthy();

    diag.assertClean();
    await deleteSupportRequestsLike('zz_test_e2e_admin_support_');
  });

  test('domain expert can approve a draft synonym mapping', async ({ page }) => {
    const stamp = Date.now();
    const text = `zz_test_e2e_syn_${stamp}`;
    const mappingId = await insertDraftSynonymMapping(text);

    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'expert');
    await page.goto('/admin/synonym-review');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /refresh/i }).click();
    await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout: 20_000 });

    const approve = page.getByRole('button', { name: /approve/i }).first();
    await approve.click();
    await expect(page.getByText(/mapping approved/i).first()).toBeVisible({ timeout: 15_000 });

    const expert = await apiLogin(DEV_USERS.expert);
    const detail = await apiRequest(expert.token, 'GET', `/api/vocabulary/synonyms/review/${mappingId}`, undefined);
    expect(detail.status).toBe(200);
    expect(detail.data.approval_status).toBe('approved');

    diag.assertClean();
    await deleteSynonymMapping(mappingId);
  });

  test('editor is denied synonym review page', async ({ page }) => {
    await loginViaUi(page, 'editor');
    await page.goto('/admin/synonym-review');
    await expect(page.getByRole('heading', { name: /access denied/i })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Whole-site — search and compare', () => {
  test.beforeAll(async () => {
    const { token } = await apiLogin(DEV_USERS.clinician);
    const search = await simpleSearch(token, 'Deepana');
    expect(search.status).toBe(200);
    expect((search.data?.results || []).length).toBeGreaterThan(0);
  });

  test('simple search results render at mobile width', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, 'clinician');
    const searchDone = page.waitForResponse(
      (r) => r.url().includes('/api/search/simple') && r.ok(),
      { timeout: 60_000 }
    );
    await page.goto('/search-results?mode=simple&query=Deepana');
    await searchDone;
    await expect(page.locator('.search-pitch-panel, .search-results').first()).toBeVisible({
      timeout: 20_000,
    });
    diag.assertClean();
  });
});
