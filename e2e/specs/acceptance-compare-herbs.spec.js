/**
 * Acceptance Test 4 — herb comparison via UI (no pre-seeded localStorage).
 */
import { test, expect } from '@playwright/test';
import { apiLogin, DEV_USERS, listHerbs } from '../helpers/api.js';
import { COMPARE_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

test.describe('Acceptance 4 — compare herbs', () => {
  let herbA = '';
  let herbB = '';
  let herbC = '';

  test.beforeAll(async () => {
    const { token } = await apiLogin(DEV_USERS.clinician);
    const list = await listHerbs(token);
    const herbs = list.data?.data || [];
    expect(herbs.length).toBeGreaterThan(2);
    herbA = herbs[0].english_name;
    herbB = herbs[1].english_name;
    herbC = herbs[2].english_name;
    expect(herbA).toBeTruthy();
    expect(herbB).toBeTruthy();
    expect(herbC).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  async function selectHerbsInLibrary(page, names) {
    const herbsLoaded = page.waitForResponse(
      (r) => r.url().includes('/api/herbs') && r.request().method() === 'GET' && r.ok(),
      { timeout: 30_000 }
    );
    await page.goto('/herb-library');
    await herbsLoaded;
    await expect(page.locator('.herb-library-card').first()).toBeVisible({ timeout: 20_000 });
    for (const name of names) {
      const card = page.locator('.herb-library-card').filter({ has: page.locator('h2', { hasText: name }) });
      await expect(card).toHaveCount(1);
      await card.click();
      await expect(card).toHaveClass(/selected/);
    }
  }

  test('Tests A–D — full comparison workflow', async ({ page }) => {
    const diag = attachPageDiagnostics(page);

    await test.step('A1–A6. Select two herbs in herb library and open compare', async () => {
      await loginViaUi(page, 'clinician');
      const stored = await page.evaluate(() => localStorage.getItem('selectedCompareHerbs'));
      expect(stored).toBeFalsy();

      await selectHerbsInLibrary(page, [herbA, herbB]);
      await expect(page.getByText(/2 herbs selected\. ready to compare/i)).toBeVisible();

      await page.locator('button.compare-selected-button').click();
      await expect(page).toHaveURL(/\/compare/, { timeout: 15_000 });

      const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('selectedCompareHerbs') || '[]'));
      expect(ids.length).toBe(2);
    });

    await test.step('B1–B5. Comparison table shows both herbs with attributes', async () => {
      await expect(page.getByRole('heading', { level: 1, name: COMPARE_TITLE })).toBeVisible();
      await expect(page.locator('.comparison-section')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbA })).toBeVisible();
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbB })).toBeVisible();
      await expect(page.getByText(/unnamed herb/i)).toHaveCount(0);
      await expect(page.locator('.comparison-row').filter({ hasText: /rasa|part used/i }).first()).toBeVisible();
    });

    await test.step('C1–C4. Refresh and navigate away preserve selection (localStorage)', async () => {
      const idsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('selectedCompareHerbs') || '[]'));
      expect(idsBefore.length).toBe(2);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('.comparison-section')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbA })).toBeVisible();

      await page.goto('/doctor');
      await page.goto('/compare');
      await expect(page).toHaveURL(/\/compare/);
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbB })).toBeVisible({ timeout: 20_000 });

      const idsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('selectedCompareHerbs') || '[]'));
      expect(idsAfter.length).toBe(2);
    });

    await test.step('D1–D3. Remove one herb, rebuild pair, then compare three herbs', async () => {
      await page.locator('.remove-herb-button').first().click();
      await expect(page.locator('.comparison-section')).toHaveCount(0);
      await expect(page.locator('.compare-incomplete-state')).toBeVisible();

      const idsOne = await page.evaluate(() => JSON.parse(localStorage.getItem('selectedCompareHerbs') || '[]'));
      expect(idsOne.length).toBe(1);

      await page.locator('.compare-incomplete-state button.add-herb-button').click();
      await expect(page).toHaveURL(/\/herb-library/);
      await selectHerbsInLibrary(page, [herbB, herbC]);
      await page.locator('button.compare-selected-button').click();
      await expect(page).toHaveURL(/\/compare/);
      await expect(page.locator('.comparison-section')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbB })).toBeVisible();
      await expect(page.locator('.comparison-herb-header h2').filter({ hasText: herbC })).toBeVisible();

      await page.goto('/herb-library');
      await expect(page.locator('.herb-library-card').first()).toBeVisible({ timeout: 20_000 });
      await selectHerbsInLibrary(page, [herbA, herbB, herbC]);
      await page.locator('button.compare-selected-button').click();
      await expect(page).toHaveURL(/\/compare/);
      await expect(page.getByRole('heading', { name: /3 herbs selected/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.comparison-herb-header h2')).toHaveCount(3);

      const idsThree = await page.evaluate(() => JSON.parse(localStorage.getItem('selectedCompareHerbs') || '[]'));
      expect(idsThree.length).toBe(3);
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
