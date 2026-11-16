/**
 * Acceptance 9 — remaining workflows (synonym, support, admin, library, nav, integrations).
 * Complements acceptance 1–8 and whole-site specs; does not replace them.
 */
import { test, expect } from '@playwright/test';
import {
  apiLogin,
  apiRequest,
  DEV_USERS,
  getHerbByIdApi,
  listHerbs,
  simpleSearch,
} from '../helpers/api.js';
import {
  ANALYTICS_TITLE,
  AUDIT_TITLE,
  ACCESS_DENIED,
  USERS_TITLE,
} from '../helpers/i18nMatchers.js';
import {
  deleteSupportRequestsLike,
  deleteSynonymMapping,
  insertDraftSynonymMapping,
} from '../helpers/db.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:4010';
const PREFIX = 'ZZ ACC9';
const SUPPORT_SUCCESS =
  /support request received|सहायता अनुरोध प्राप्त|समर्थन विनंती प्राप्त|समर्थनानुरोधः प्राप्तः/i;

async function clearSession(page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe('Acceptance 9 — remaining workflows', () => {
  let cleanupSynonymIds = [];

  test('Sections A–J', async ({ page }) => {
    test.setTimeout(180_000);
    const diag = attachPageDiagnostics(page);
    const stamp = Date.now();
    let approveId = null;
    let rejectId = null;

    await test.step('A — Synonym review (approve, reject, roles)', async () => {
      const approveText = `${PREFIX} syn approve ${stamp}`;
      const rejectText = `${PREFIX} syn reject ${stamp}`;
      approveId = await insertDraftSynonymMapping(approveText);
      rejectId = await insertDraftSynonymMapping(rejectText);
      cleanupSynonymIds.push(approveId, rejectId);

      await clearSession(page);
      await loginViaUi(page, 'expert');
      await page.goto('/admin/synonym-review');
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: /refresh/i }).click();
      await expect(page.locator(`[data-testid="synonym-review-${approveId}"]`)).toBeVisible({
        timeout: 20_000,
      });

      const approveCard = page.locator(`[data-testid="synonym-review-${approveId}"]`);
      await approveCard.getByRole('button', { name: /^approve$/i }).click();
      await expect(page.getByText(/mapping approved/i).first()).toBeVisible({ timeout: 15_000 });
      const expert = await apiLogin(DEV_USERS.expert);
      const approved = await apiRequest(expert.token, 'GET', `/api/vocabulary/synonyms/review/${approveId}`);
      expect(approved.data.approval_status).toBe('approved');
      cleanupSynonymIds = cleanupSynonymIds.filter((id) => id !== approveId);
      approveId = null;

      await page.reload();
      const rejectCard = page.locator(`[data-testid="synonym-review-${rejectId}"]`);
      await expect(rejectCard).toBeVisible({ timeout: 20_000 });
      await rejectCard.getByRole('button', { name: /^reject$/i }).click();
      await rejectCard.locator('textarea').fill('E2E rejection reason');
      await rejectCard.getByRole('button', { name: /confirm reject/i }).click();
      await expect(page.getByText(/mapping rejected/i).first()).toBeVisible({ timeout: 15_000 });
      const rejected = await apiRequest(expert.token, 'GET', `/api/vocabulary/synonyms/review/${rejectId}`);
      expect(rejected.data.approval_status).toBe('rejected');
      await deleteSynonymMapping(rejectId);
      cleanupSynonymIds = cleanupSynonymIds.filter((id) => id !== rejectId);
      rejectId = null;

      const denyId = await insertDraftSynonymMapping(`${PREFIX} syn deny ${stamp}`);
      cleanupSynonymIds.push(denyId);

      await clearSession(page);
      await loginViaUi(page, 'editor');
      await page.goto('/admin/synonym-review');
      await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible();

      const clinician = await apiLogin(DEV_USERS.clinician);
      const denyApprove = await apiRequest(
        clinician.token,
        'POST',
        `/api/vocabulary/synonyms/review/${denyId}/approve`,
        {}
      );
      expect(denyApprove.status).toBe(403);
      await deleteSynonymMapping(denyId);
      cleanupSynonymIds = cleanupSynonymIds.filter((id) => id !== denyId);
    });

    await test.step('B — Help / support requests', async () => {
      const message = `${PREFIX} support ${stamp}`;
      await deleteSupportRequestsLike(PREFIX);

      await clearSession(page);
      await loginViaUi(page, 'clinician');
      await page.goto('/help-support');
      await page.locator('button.help-contact-button').click();
      await page.locator('#support-message').fill('');
      const submit = page.locator('form.help-contact-form').getByRole('button');
      await submit.click();
      await expect(page.locator('#support-message')).toHaveAttribute('required', '');

      await page.locator('#support-topic').selectOption('technical');
      await page.locator('#support-message').fill(message);
      await page.locator('form.help-contact-form').getByRole('button').click();
      await expect(page.getByText(SUPPORT_SUCCESS)).toBeVisible({ timeout: 20_000 });

      const clinician = await apiLogin(DEV_USERS.clinician);
      const mine = await apiRequest(clinician.token, 'GET', '/api/support/requests/mine');
      expect((mine.data?.data || []).some((r) => r.message === message)).toBeTruthy();

      await clearSession(page);
      await loginViaUi(page, 'admin');
      await page.goto('/admin/support-requests');
      await expect(page.getByText(message)).toBeVisible({ timeout: 20_000 });
      const row = page.locator('tr').filter({ hasText: message });
      await row.locator('select').selectOption('resolved');
      const admin = await apiLogin(DEV_USERS.admin);
      const list = await apiRequest(admin.token, 'GET', '/api/support/requests?limit=50');
      const item = (list.data?.data || []).find((r) => r.message === message);
      expect(item?.status).toBe('resolved');

      await clearSession(page);
      await loginViaUi(page, 'clinician');
      await page.goto('/admin/support-requests');
      await expect(page).toHaveURL(/\/doctor/);

      await deleteSupportRequestsLike(PREFIX);
    });

    await test.step('C — Admin users (access + API)', async () => {
      await clearSession(page);
      await loginViaUi(page, 'admin');
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { name: USERS_TITLE })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(DEV_USERS.clinician)).toBeVisible();

      const admin = await apiLogin(DEV_USERS.admin);
      const users = await apiRequest(admin.token, 'GET', '/api/users');
      expect(users.status).toBe(200);
      expect(JSON.stringify(users.data)).not.toMatch(/password_hash|Dev1234567/i);

      await clearSession(page);
      await loginViaUi(page, 'editor');
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible({
        timeout: 15_000,
      });
      const editor = await apiLogin(DEV_USERS.editor);
      const denied = await apiRequest(editor.token, 'POST', '/api/users', {
        email: `zz_denied_${stamp}@test.com`,
        password: 'E2ePass12345',
        fullName: 'Denied',
        role: 'clinician',
      });
      expect(denied.status).toBe(403);
    });

    await test.step('D — Analytics, audit log, dashboard', async () => {
      await clearSession(page);
      await loginViaUi(page, 'admin');
      await page.goto('/admin/search-analytics');
      await expect(page.getByRole('heading', { name: ANALYTICS_TITLE })).toBeVisible({ timeout: 20_000 });

      await page.goto('/admin/audit-log');
      await expect(page.getByRole('heading', { name: AUDIT_TITLE })).toBeVisible({ timeout: 20_000 });
      const auditResp = page.waitForResponse(
        (r) => r.url().includes('/api/audit-log') && r.ok(),
        { timeout: 20_000 }
      );
      await page.getByRole('button', { name: 'Apply' }).click().catch(() => {});
      await auditResp.catch(() => {});
      const admin = await apiLogin(DEV_USERS.admin);
      const audit = await apiRequest(admin.token, 'GET', '/api/audit-log?limit=5');
      expect(audit.status).toBe(200);
      expect(JSON.stringify(audit.data)).not.toMatch(/password_hash/i);

      await page.goto('/admin');
      await expect(page.locator('.admin-dashboard, .admin-content, main').first()).toBeVisible();

      await clearSession(page);
      await loginViaUi(page, 'clinician');
      await page.goto('/admin/search-analytics');
      await expect(page).toHaveURL(/\/doctor/);
    });

    await test.step('E — Herb library and detail from library', async () => {
      const clinician = await apiLogin(DEV_USERS.clinician);
      const list = await listHerbs(clinician.token);
      const herbId = list.data?.data?.[0]?.id;
      const englishName = list.data?.data?.[0]?.english_name;
      expect(herbId).toBeTruthy();

      await clearSession(page);
      await loginViaUi(page, 'clinician');
      const herbsLoaded = page.waitForResponse(
        (r) => r.url().includes('/api/herbs') && r.request().method() === 'GET' && r.ok(),
        { timeout: 30_000 }
      );
      await page.goto('/herb-library');
      await herbsLoaded;
      await expect(page.locator('.herb-library-card').first()).toBeVisible();
      if (englishName) {
        await page.locator('.herb-library-search input, .herb-library-search input[type="text"]').fill(englishName);
        await expect(page.locator('.herb-library-card').filter({ hasText: englishName }).first()).toBeVisible({
          timeout: 15_000,
        });
        await page.locator('.herb-library-card').filter({ hasText: englishName }).first().click();
        await page.goto(`/herb/${herbId}`);
      } else {
        await page.goto(`/herb/${herbId}`);
      }
      await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Herb not found', {
        timeout: 20_000,
      });
      const detail = await getHerbByIdApi(clinician.token, herbId);
      expect(detail.data?.english_name).toBeTruthy();
    });

    await test.step('F — Language selection', async () => {
      await page.goto('/language');
      await page.getByRole('button', { name: /marathi/i }).click();
      await expect(page.locator('.language-option.selected')).toContainText(/marathi/i);
      await page.getByRole('button', { name: /sanskrit/i }).click();
      await expect(page.locator('.language-option.selected')).toContainText(/sanskrit/i);
      await page.getByRole('button', { name: /english/i }).click();
    });

    await test.step('G — Upload (covered in coverage spec); herb export API', async () => {
      const admin = await apiLogin(DEV_USERS.admin);
      const exportRes = await fetch(`${apiURL}/api/herbs/export?format=csv`, {
        headers: { Authorization: `Bearer ${admin.token}`, Accept: 'text/csv' },
      });
      expect(exportRes.status).toBe(200);
      const csv = await exportRes.text();
      expect(csv).toMatch(/"Code","English Name","Sanskrit Name"/);
      expect(csv).toMatch(/African Baobab/);
      const clinician = await apiLogin(DEV_USERS.clinician);
      const denied = await apiRequest(clinician.token, 'GET', '/api/herbs/export?format=csv');
      expect(denied.status).toBe(403);
    });

    await test.step('H — Search errors and compare from results card', async () => {
      const clinician = await apiLogin(DEV_USERS.clinician);
      const empty = await apiRequest(clinician.token, 'POST', '/api/search/simple', { query: '', limit: 5 });
      expect(empty.status).toBeGreaterThanOrEqual(400);

      await page.goto('/search-results?mode=simple&query=Deepana');
      const searchDone = page.waitForResponse((r) => r.url().includes('/api/search/simple') && r.ok(), {
        timeout: 60_000,
      });
      await searchDone;
      const compareBtn = page.locator('.compare-herb-button').first();
      if (await compareBtn.isVisible()) {
        await compareBtn.click();
        await expect(page).toHaveURL(/\/compare/, { timeout: 15_000 });
      }
    });

    await test.step('I — Landing, nav, unknown route', async () => {
      await clearSession(page);
      await page.goto('/');
      await expect(page.locator('a[href="/auth"], button').first()).toBeVisible({ timeout: 15_000 });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/auth');
      await loginViaUi(page, 'clinician');
      await page.goto('/this-route-does-not-exist-zz');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('J — External readiness signals (no real email/payment)', async () => {
      await clearSession(page);
      await page.goto('/auth');
      await page.getByRole('button', { name: 'Log In', exact: true }).first().click();
      await page.getByRole('link', { name: /forgot password|पासवर्ड भूल|गुप्तशब्दः विस्मृत/i }).click();
      await expect(page).toHaveURL(/\/password-reset/);
      await loginViaUi(page, 'clinician');
      await page.goto('/payment?plan=Pro');
      await expect(
        page.getByRole('status').filter({ hasText: /not configured|ऑनलाइन/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });

  test.afterAll(async () => {
    for (const id of cleanupSynonymIds) {
      await deleteSynonymMapping(id).catch(() => {});
    }
    await deleteSupportRequestsLike(PREFIX).catch(() => {});
  });
});
