/**
 * Acceptance Test 1 — clinician golden path (isolated DB 54334 + API 4010).
 */
import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, DEV_USERS, simpleSearch } from '../helpers/api.js';
import { FAVORITES_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi, logoutViaUi } from '../helpers/ui.js';

const SEARCH_QUERY = 'Deepana';

test.describe('Acceptance 1 — clinician golden path', () => {
  test.beforeAll(async () => {
    const { token } = await apiLogin(DEV_USERS.clinician);
    const search = await simpleSearch(token, SEARCH_QUERY);
    expect(search.status).toBe(200);
    expect((search.data?.results || []).length).toBeGreaterThan(0);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('complete clinician workflow', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    let herbId = '';
    let herbTitle = '';
    let apiToken = '';

    await test.step('1–2. Log in as clinician and reach /doctor', async () => {
      await loginViaUi(page, 'clinician');
      await expect(page).toHaveURL(/\/doctor/);
      apiToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(apiToken).toBeTruthy();
    });

    await test.step('3–4. Simple search with results and pitch panel', async () => {
      const searchDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/search/simple') && resp.ok(),
        { timeout: 45_000 }
      );
      await page.goto(`/search-results?mode=simple&query=${encodeURIComponent(SEARCH_QUERY)}`);
      const searchRes = await searchDone;
      const searchJson = await searchRes.json();
      expect((searchJson.results || []).length).toBeGreaterThan(0);

      await expect(page.locator('.search-pitch-panel')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.herb-results-list .herb-result-card').first()).toBeVisible({
        timeout: 15_000,
      });
      const chip = page.locator('.search-pitch-herb-chip').first();
      await expect(chip).toBeVisible();
      await chip.click();
      const whyItems = page.locator('.search-pitch-why-list li');
      await expect(whyItems.first()).toBeVisible({ timeout: 10_000 });
      expect(await whyItems.count()).toBeGreaterThan(0);
    });

    await test.step('5. Open herb detail from search results', async () => {
      const firstCard = page.locator('.herb-results-list .herb-result-card').first();
      herbTitle = ((await firstCard.locator('h2, h3').first().textContent()) || '').trim();
      await firstCard.getByRole('button', { name: /view profile/i }).click();
      await expect(page).toHaveURL(/\/herb\/[0-9a-f-]{36}/i, { timeout: 20_000 });
      const match = page.url().match(/\/herb\/([0-9a-f-]{36})/i);
      herbId = match?.[1] || '';
      expect(herbId).toBeTruthy();
      await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Herb not found', {
        timeout: 20_000,
      });
      const detailRes = await page.waitForResponse(
        (r) => r.url().includes(`/api/herbs/${herbId}`) && r.ok(),
        { timeout: 20_000 }
      );
      expect(detailRes.ok()).toBeTruthy();
    });

    await test.step('6. Add herb to favorites', async () => {
      const favPost = page.waitForResponse(
        (r) => r.url().includes('/api/favorites') && r.request().method() === 'POST' && r.ok(),
        { timeout: 15_000 }
      );
      await page.locator('.herb-favorite-button').click();
      await favPost;
      await expect(page.locator('.herb-favorite-button.favorite-active')).toBeVisible({ timeout: 10_000 });

      const listed = await apiRequest(apiToken, 'GET', '/api/favorites');
      expect(listed.status).toBe(200);
      const ids = (listed.data?.data || []).map((row) => row.herb_id);
      expect(ids).toContain(herbId);
    });

    await test.step('7. Favorites page lists the herb', async () => {
      const favoritesGet = page.waitForResponse(
        (r) => r.url().includes('/api/favorites') && r.request().method() === 'GET' && r.ok(),
        { timeout: 20_000 }
      );
      await page.goto('/favorites');
      await favoritesGet;
      await expect(page.getByRole('heading', { name: FAVORITES_TITLE })).toBeVisible({ timeout: 15_000 });
      if (herbTitle) {
        await expect(page.getByText(herbTitle, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.locator('.favorites-herb-card, .saved-herb-card, article').first()).toBeVisible({
          timeout: 15_000,
        });
      }
    });

    await test.step('8. Remove favorite and confirm UI + API', async () => {
      const removeBtn = page.getByRole('button', { name: /remove/i }).first();
      await expect(removeBtn).toBeVisible({ timeout: 10_000 });
      const del = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/favorites/${herbId}`) &&
          r.request().method() === 'DELETE' &&
          (r.ok() || r.status() === 204),
        { timeout: 15_000 }
      );
      await removeBtn.click();
      await del;

      const listed = await apiRequest(apiToken, 'GET', '/api/favorites');
      const ids = (listed.data?.data || []).map((row) => row.herb_id);
      expect(ids).not.toContain(herbId);
    });

    await test.step('9. Session persists after refresh', async () => {
      await page.goto('/doctor');
      await expect(page).toHaveURL(/\/doctor/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/doctor/);
      const tokenAfter = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenAfter).toBeTruthy();
      const account = await apiRequest(tokenAfter, 'GET', '/api/account');
      expect(account.status).toBe(200);
      expect(account.data?.data?.email).toBe(DEV_USERS.clinician);
    });

    await test.step('10. Logout blocks /herb-library', async () => {
      await logoutViaUi(page);
      await page.goto('/herb-library');
      await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
      const tokenAfter = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenAfter).toBeFalsy();
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
