/**
 * Acceptance Test 3 — detailed search, save, reopen, delete (isolated 54334 + API 4010).
 */
import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, DEV_USERS } from '../helpers/api.js';
import { FAVORITES_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const SAVED_SEARCHES_TAB = /saved searches|सहेजी खोजें|जतन केलेले शोध|रक्षितान्वेषणानि/i;

const SEARCH_NAME_PREFIX = 'zz_acc3_detailed_';
const RASA_PARAM_TITLE = 'Rasa';

async function deleteSavedSearchesLike(token, prefix) {
  const listed = await apiRequest(token, 'GET', '/api/saved-searches');
  for (const row of listed.data?.data || []) {
    if (String(row.name || '').startsWith(prefix)) {
      await apiRequest(token, 'DELETE', `/api/saved-searches/${row.id}`);
    }
  }
}

async function detailedSearchApi(token, filters) {
  return apiRequest(token, 'POST', '/api/search/detailed', { filters, limit: 50 });
}

test.describe('Acceptance 3 — saved detailed searches', () => {
  const searchName = `${SEARCH_NAME_PREFIX}${Date.now()}`;
  let savedSearchId = null;
  let clinicianToken = '';
  let selectedRasaSlug = '';

  test.beforeAll(async () => {
    const { token } = await apiLogin(DEV_USERS.clinician);
    const probe = await detailedSearchApi(token, { rasa: ['tikta'] });
    expect(probe.status).toBe(200);
    expect((probe.data?.results || []).length).toBeGreaterThan(0);
    await deleteSavedSearchesLike(token, SEARCH_NAME_PREFIX);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterAll(async () => {
    if (clinicianToken) {
      await deleteSavedSearchesLike(clinicianToken, SEARCH_NAME_PREFIX);
    }
  });

  test('Tests A–D — detailed search lifecycle', async ({ page }) => {
    const diag = attachPageDiagnostics(page);

    await test.step('A1–A2. Log in and open detailed search', async () => {
      await loginViaUi(page, 'clinician');
      clinicianToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      await page.goto('/search?mode=detailed');
      await expect(page.getByRole('button', { name: /detailed search/i })).toHaveClass(/active/);
    });

    await test.step('A3–A5. Select Rasa (tikta) and submit detailed search', async () => {
      await expect(page.getByText('Loading search filters', { exact: false })).toBeHidden({
        timeout: 30_000,
      });
      const rasaSection = page.locator('.parameter-wrapper').filter({
        has: page.locator('h3.parameter-title', { hasText: RASA_PARAM_TITLE }),
      });
      const tiktaChip = rasaSection.getByRole('button', { name: /tikta/i }).first();
      await expect(tiktaChip).toBeVisible({ timeout: 15_000 });
      selectedRasaSlug = (await tiktaChip.textContent())?.trim() || 'tikta';
      await tiktaChip.click();
      await expect(tiktaChip).toHaveClass(/selected/);

      const searchDone = page.waitForResponse(
        (r) => r.url().includes('/api/search/detailed') && r.request().method() === 'POST' && r.ok(),
        { timeout: 45_000 }
      );
      await page.locator('button.detailed-search-button').click();
      await expect(page).toHaveURL(/mode=detailed/, { timeout: 15_000 });
      const searchRes = await searchDone;
      const body = await searchRes.json();
      expect((body.results || []).length).toBeGreaterThan(0);
      await expect(page.locator('.herb-results-list .herb-result-card').first()).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step('B1–B3. Save search from results UI', async () => {
      const saveButton = page
        .locator('button.results-filter-button')
        .filter({ hasText: /save search|खोज सहेजें|शोध जतन|अन्वेषणं रक्ष/i });
      await expect(saveButton.first()).toBeVisible({ timeout: 15_000 });

      const saveRes = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/saved-searches') && r.request().method() === 'POST' && r.ok(),
          { timeout: 20_000 }
        ),
        (async () => {
          page.once('dialog', async (dialog) => {
            expect(dialog.type()).toBe('prompt');
            await dialog.accept(searchName);
          });
          await saveButton.first().click();
        })(),
      ]).then(([response]) => response);
      const saved = await saveRes.json();
      savedSearchId = saved.id;
      expect(savedSearchId).toBeTruthy();
      await expect(page.getByText(/search saved/i)).toBeVisible({ timeout: 10_000 });

      const listed = await apiRequest(clinicianToken, 'GET', '/api/saved-searches');
      expect(listed.status).toBe(200);
      const row = (listed.data?.data || []).find((r) => r.id === savedSearchId);
      expect(row).toBeTruthy();
      expect(row.name).toBe(searchName);
      expect(row.filters?.mode).toBe('detailed');
      expect(row.filters?.parameters?.Rasa).toEqual(
        expect.arrayContaining([expect.stringMatching(/tikta/i)])
      );
    });

    await test.step('B4–B5. Persistence after page reload', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/mode=detailed/);
      const listed = await apiRequest(clinicianToken, 'GET', '/api/saved-searches');
      expect((listed.data?.data || []).some((r) => r.id === savedSearchId)).toBeTruthy();
    });

    await test.step('C1–C6. Reopen saved search from /favorites', async () => {
      const listGet = page.waitForResponse(
        (r) => r.url().includes('/api/saved-searches') && r.request().method() === 'GET' && r.ok(),
        { timeout: 20_000 }
      );
      await page.goto('/favorites');
      await listGet;
      await expect(page).toHaveURL(/\/favorites/);
      await expect(page.getByRole('heading', { name: FAVORITES_TITLE })).toBeVisible({ timeout: 15_000 });
      await page.locator('button.favorites-tab').filter({ hasText: SAVED_SEARCHES_TAB }).click();
      const card = page.locator('.saved-herb-card').filter({ hasText: searchName });
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card.getByText(/detailed search/i)).toBeVisible();

      const rerun = page.waitForResponse(
        (r) => r.url().includes('/api/search/detailed') && r.request().method() === 'POST' && r.ok(),
        { timeout: 45_000 }
      );
      await card.getByRole('button', { name: /run search/i }).click();
      await expect(page).toHaveURL(/mode=detailed/, { timeout: 15_000 });
      await rerun;
      const paramsRaw = new URL(page.url()).searchParams.get('parameters') || '';
      expect(paramsRaw.length).toBeGreaterThan(0);
      const parsed = JSON.parse(decodeURIComponent(paramsRaw));
      expect(parsed.Rasa).toEqual(expect.arrayContaining([expect.stringMatching(/tikta/i)]));
      await expect(page.locator('.herb-results-list .herb-result-card').first()).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step('D1–D4. Delete saved search and confirm persistence', async () => {
      await page.goto('/favorites');
      await page.locator('button.favorites-tab').filter({ hasText: SAVED_SEARCHES_TAB }).click();
      const card = page.locator('.saved-herb-card').filter({ hasText: searchName });
      await expect(card).toBeVisible();

      const del = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/saved-searches/${savedSearchId}`) &&
          r.request().method() === 'DELETE' &&
          r.ok(),
        { timeout: 15_000 }
      );
      await card.getByRole('button', { name: /remove/i }).click();
      await del;

      await expect(page.locator('.saved-herb-card').filter({ hasText: searchName })).toHaveCount(0, {
        timeout: 10_000,
      });

      const listed = await apiRequest(clinicianToken, 'GET', '/api/saved-searches');
      expect((listed.data?.data || []).some((r) => r.id === savedSearchId)).toBeFalsy();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('button.favorites-tab').filter({ hasText: SAVED_SEARCHES_TAB }).click();
      await expect(page.locator('.saved-herb-card').filter({ hasText: searchName })).toHaveCount(0);
      savedSearchId = null;
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
