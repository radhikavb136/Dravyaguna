/**
 * Real UI workflow against the running dev API (not the isolated E2E DB).
 * Run only when explicitly enabled:
 *   E2E_DEV_WORKFLOW=1 DEV_USER_PASSWORD=<dev> E2E_API_URL=http://localhost:4000 npm run test:e2e -- e2e/specs/dev-application-workflow.spec.js
 */
import { test, expect } from '@playwright/test';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const enabled = process.env.E2E_DEV_WORKFLOW === '1';
const apiURL = process.env.E2E_API_URL || 'http://localhost:4000';

test.describe('Dev application workflow (live API)', () => {
  test.skip(!enabled, 'Set E2E_DEV_WORKFLOW=1 to run against dev API');

  test.beforeAll(async () => {
    const res = await fetch(`${apiURL}/api/health`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Dev API not healthy at ${apiURL}`);
    const body = await res.json();
    if (body.database !== 'ok') throw new Error('Dev API database not ok');
  });

  test('clinician: login, search, pitch panel, herb detail without console errors', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');

    const searchDone = page.waitForResponse(
      (r) => r.url().includes('/api/search/simple') && r.ok(),
      { timeout: 60_000 }
    );
    await page.goto('/search-results?mode=simple&query=Deepana');
    await searchDone;

    await expect(page.locator('.search-pitch-panel')).toBeVisible({ timeout: 20_000 });
    const viewProfile = page.getByRole('button', { name: 'View profile' }).first();
    if (await viewProfile.count()) {
      await viewProfile.click();
      await expect(page).toHaveURL(/\/herb\//, { timeout: 15_000 });
    }
    diag.assertClean();
  });

  test('session persists after reload', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');
    await page.goto('/doctor');
    await expect(page.getByRole('banner').getByText('Dev Clinician')).toBeVisible();
    await page.reload();
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.getByRole('banner').getByText('Dev Clinician')).toBeVisible({ timeout: 15_000 });
    diag.assertClean();
  });
});
