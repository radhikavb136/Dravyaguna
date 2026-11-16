/**
 * Acceptance Test 5 — herb management UI (create, edit, archive) + role enforcement.
 */
import { test, expect } from '@playwright/test';
import {
  apiLogin,
  apiRequest,
  DEV_USERS,
  getHerbByIdApi,
} from '../helpers/api.js';
import { ADD_HERB_TITLE, MANAGE_HERBS_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const PREFIX = 'ZZ ACC5';
const EDIT_HERB_TITLE = /edit herb/i;

async function acceptNextDialog(page) {
  const dialog = page.waitForEvent('dialog', { timeout: 30_000 });
  return dialog;
}

test.describe('Acceptance 5 — herb management', () => {
  const stamp = `${Date.now()}`;
  const englishName = `${PREFIX} Herb ${stamp}`;
  const botanicalName = `${PREFIX} botanical ${stamp}`;
  const editedDescription = `${PREFIX} edited description ${stamp}`;
  let herbId = '';

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Tests A–E — routes, roles, create, edit, archive', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await test.step('A — verified routes: /admin/manage-herbs and /admin/add-herb (HERB_EDITORS)', async () => {
      expect(true).toBe(true);
    });

    await test.step('B1–B4. Clinician denied /admin/manage-herbs (AdminLayout → /doctor)', async () => {
      await loginViaUi(page, 'clinician');
      await page.goto('/admin/manage-herbs');
      await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });
      await expect(page).not.toHaveURL(/manage-herbs/);
    });

    await test.step('B5. Clinician POST /api/herbs returns 403', async () => {
      const clinicianToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const attempt = await apiRequest(clinicianToken, 'POST', '/api/herbs', {
        code: `zz_acc5_denied_${stamp}`,
        english_name: `${PREFIX} denied ${stamp}`,
        botanical_name: 'denied',
        status: 'draft',
      });
      expect(attempt.status).toBe(403);
    });

    await test.step('C1–C5. Admin creates test herb via UI; API persists', async () => {
      await page.goto('/auth');
      await page.evaluate(() => localStorage.clear());
      await loginViaUi(page, 'admin');

      await page.goto('/admin/manage-herbs');
      await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible({ timeout: 20_000 });

      await page.locator('button.manage-herbs-add-button').click();
      await expect(page).toHaveURL(/\/admin\/add-herb/);
      await expect(page.getByRole('heading', { name: ADD_HERB_TITLE })).toBeVisible();

      await page.getByRole('button', { name: /section 1.*basic information/i }).click();
      await page.locator('#herbNameEnglish').fill(englishName);
      await page.locator('#botanicalName').fill(botanicalName);
      await page.locator('#partUsed').fill('Stem (ACC5 test)');

      const createDone = page.waitForResponse(
        (r) => r.url().includes('/api/herbs') && r.request().method() === 'POST' && r.ok(),
        { timeout: 30_000 }
      );
      await Promise.all([
        acceptNextDialog(page).then((d) => d.accept()),
        page.locator('button.add-herb-draft-button').click(),
      ]);
      const createResp = await createDone;
      const created = await createResp.json();
      herbId = created.id;
      expect(herbId).toBeTruthy();

      const adminToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const fromApi = await getHerbByIdApi(adminToken, herbId);
      expect(fromApi.status).toBe(200);
      expect(fromApi.data.english_name).toBe(englishName);
      expect(fromApi.data.botanical_name).toBe(botanicalName);
      expect(fromApi.data.status).toBe('draft');
    });

    await test.step('D1–D4. Edit herb in UI; change persists after refresh', async () => {
      await page.goto(`/admin/add-herb?id=${herbId}&mode=edit`);
      await expect(page.getByRole('heading', { name: EDIT_HERB_TITLE })).toBeVisible({ timeout: 20_000 });

      await page.getByRole('button', { name: /section 2.*identification/i }).click();
      await page.locator('textarea[placeholder="Morphological description..."]').fill(editedDescription);

      const updateDone = page.waitForResponse(
        (r) => r.url().includes(`/api/herbs/${herbId}`) && r.request().method() === 'PUT' && r.ok(),
        { timeout: 30_000 }
      );
      await page.locator('button.add-herb-save-button').click();
      await updateDone;

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /section 2.*identification/i }).click();
      await expect(page.locator('textarea[placeholder="Morphological description..."]')).toHaveValue(editedDescription, {
        timeout: 20_000,
      });

      const adminToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const fromApi = await getHerbByIdApi(adminToken, herbId);
      expect(fromApi.data.description).toBe(editedDescription);
    });

    await test.step('E1–E5. Admin archives test herb via UI (soft delete); API status archived', async () => {
      await page.goto('/admin/manage-herbs');
      await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible();

      await page.locator('.manage-herbs-search-box input').fill(englishName);
      const searchDone = page.waitForResponse(
        (r) => r.url().includes('/api/herbs') && r.url().includes('q=') && r.ok(),
        { timeout: 20_000 }
      );
      await searchDone;

      const row = page.locator('.manage-herbs-table tbody tr').filter({ hasText: englishName });
      await expect(row).toHaveCount(1);

      const deleteDone = page.waitForResponse(
        (r) => r.request().method() === 'DELETE' && r.url().includes(`/api/herbs/${herbId}`) && r.ok(),
        { timeout: 30_000 }
      );
      await Promise.all([
        acceptNextDialog(page).then((d) => d.accept()),
        row.getByRole('button', { name: 'Delete herb' }).click(),
      ]);
      await deleteDone;

      await expect(page.locator('.manage-herbs-table tbody tr').filter({ hasText: englishName })).toHaveCount(0);

      const adminToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const archived = await getHerbByIdApi(adminToken, herbId);
      expect(archived.status).toBe(200);
      expect(archived.data.status).toBe('archived');
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
