import { test, expect } from '@playwright/test';
import { apiLogin, DEV_USERS, simpleSearch } from '../helpers/api.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

test.describe('Phase 8 — search pitch panel', () => {
  test.beforeAll(async () => {
    const { token } = await apiLogin(DEV_USERS.clinician);
    const search = await simpleSearch(token, 'Deepana');
    expect(search.status).toBe(200);
    expect((search.data?.results || []).length).toBeGreaterThan(0);
  });

  test('clinician simple search shows grounded pitch panel without page errors', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');

    const searchDone = page.waitForResponse(
      (resp) => resp.url().includes('/api/search/simple') && resp.ok(),
      { timeout: 45_000 }
    );
    await page.goto('/search-results?mode=simple&query=Deepana');
    await searchDone;

    await expect(page.locator('.search-pitch-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Why not this herb?')).toBeVisible();
    await expect(page.getByText(/not clinical advice/i)).toBeVisible();
    const chip = page.locator('.search-pitch-herb-chip').first();
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page.locator('.search-pitch-why-list li').first()).toBeVisible();
    diag.assertClean();
  });
});
