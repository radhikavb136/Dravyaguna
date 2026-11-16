/**
 * Acceptance Test 7 — herb verify workflow and role enforcement (expert / editor / admin).
 */
import { test, expect } from '@playwright/test';
import { getHerbByIdApi, verifyHerb } from '../helpers/api.js';
import { ADD_HERB_TITLE, MANAGE_HERBS_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

async function clearSession(page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

const PREFIX = 'ZZ ACC7';

async function acceptAlert(page) {
  const dialog = page.waitForEvent('dialog', { timeout: 15_000 });
  return dialog.then((d) => d.accept());
}

async function createDraftHerbViaUi(page, englishName, botanicalName) {
  await page.goto('/admin/manage-herbs');
  await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible({ timeout: 20_000 });
  await page.locator('button.manage-herbs-add-button').click();
  await expect(page.getByRole('heading', { name: ADD_HERB_TITLE })).toBeVisible();
  await page.getByRole('button', { name: /section 1.*basic information/i }).click();
  await page.locator('#herbNameEnglish').fill(englishName);
  await page.locator('#botanicalName').fill(botanicalName);
  const createDone = page.waitForResponse(
    (r) => r.url().includes('/api/herbs') && r.request().method() === 'POST' && r.ok(),
    { timeout: 30_000 }
  );
  await Promise.all([acceptAlert(page), page.locator('button.add-herb-draft-button').click()]);
  const createResp = await createDone;
  const created = await createResp.json();
  expect(created.id).toBeTruthy();
  expect(created.status).toBe('draft');
  return created.id;
}

async function searchHerbRow(page, englishName) {
  await page.goto('/admin/manage-herbs');
  await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible({ timeout: 20_000 });
  const searchDone = page.waitForResponse(
    (r) => r.url().includes('/api/herbs') && r.url().includes('q=') && r.ok(),
    { timeout: 20_000 }
  );
  await page.locator('.manage-herbs-search-box input').fill(englishName);
  await searchDone;
  return page.locator('.manage-herbs-table tbody tr').filter({ hasText: englishName });
}

async function archiveHerbViaUi(page, adminToken, herbId, englishName) {
  const row = await searchHerbRow(page, englishName);
  await expect(row).toHaveCount(1);
  const deleteDone = page.waitForResponse(
    (r) => r.request().method() === 'DELETE' && r.url().includes(`/api/herbs/${herbId}`) && r.ok(),
    { timeout: 30_000 }
  );
  await Promise.all([acceptAlert(page), row.getByRole('button', { name: 'Delete herb' }).click()]);
  await deleteDone;
  const archived = await getHerbByIdApi(adminToken, herbId);
  expect(archived.data?.status).toBe('archived');
}

test.describe('Acceptance 7 — herb verification', () => {
  const stamp = `${Date.now()}`;
  const herb1Name = `${PREFIX} Verify A ${stamp}`;
  const herb2Name = `${PREFIX} Verify B ${stamp}`;
  const botanical = `${PREFIX} botanical ${stamp}`;
  let herb1Id = '';
  let herb2Id = '';

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Tests A–E — verify permissions and cleanup', async ({ page }) => {
    test.setTimeout(120_000);
    const diag = attachPageDiagnostics(page);
    let adminToken = '';

    await test.step('B1–B3. Editor creates isolated draft herb via UI', async () => {
      await loginViaUi(page, 'editor');
      herb1Id = await createDraftHerbViaUi(page, herb1Name, botanical);
      const editorToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const fromApi = await getHerbByIdApi(editorToken, herb1Id);
      expect(fromApi.status).toBe(200);
      expect(fromApi.data.status).toBe('draft');
      expect(fromApi.data.english_name).toBe(herb1Name);
    });

    await test.step('C1–C5. Domain expert verifies herb via UI; status persists', async () => {
      await clearSession(page);
      await loginViaUi(page, 'expert');
      const row = await searchHerbRow(page, herb1Name);
      await expect(row).toHaveCount(1);
      await expect(row.locator('.manage-herbs-status-badge')).toHaveText(/draft/i);

      const verifyDone = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes(`/api/herbs/${herb1Id}/verify`) && r.ok(),
        { timeout: 30_000 }
      );
      await row.getByRole('button', { name: 'Verify herb' }).click();
      await verifyDone;

      await expect(row.locator('.manage-herbs-status-badge')).toHaveText(/verified/i);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const rowAfter = await searchHerbRow(page, herb1Name);
      await expect(rowAfter.locator('.manage-herbs-status-badge')).toHaveText(/verified/i);

      const expertToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const fromApi = await getHerbByIdApi(expertToken, herb1Id);
      expect(fromApi.data.status).toBe('verified');
    });

    await test.step('D1–D6. Editor cannot verify second draft (UI + API)', async () => {
      await clearSession(page);
      await loginViaUi(page, 'editor');
      herb2Id = await createDraftHerbViaUi(page, herb2Name, botanical);
      const row = await searchHerbRow(page, herb2Name);
      await expect(row.getByRole('button', { name: 'Verify herb' })).toHaveCount(0);

      const editorToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const denied = await verifyHerb(editorToken, herb2Id);
      expect(denied.status).toBe(403);

      const unchanged = await getHerbByIdApi(editorToken, herb2Id);
      expect(unchanged.data.status).toBe('draft');
    });

    await test.step('E1–E3. Admin verifies draft herb via UI; archive test herbs only', async () => {
      await clearSession(page);
      await loginViaUi(page, 'admin');
      adminToken = await page.evaluate(() => localStorage.getItem('auth_token'));

      const row = await searchHerbRow(page, herb2Name);
      await expect(row.getByRole('button', { name: 'Verify herb' })).toHaveCount(1);
      const verifyDone = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes(`/api/herbs/${herb2Id}/verify`) && r.ok(),
        { timeout: 30_000 }
      );
      await row.getByRole('button', { name: 'Verify herb' }).click();
      await verifyDone;
      await expect(row.locator('.manage-herbs-status-badge')).toHaveText(/verified/i);

      const adminVerifyApi = await verifyHerb(adminToken, herb2Id);
      expect(adminVerifyApi.status).toBe(200);

      await archiveHerbViaUi(page, adminToken, herb1Id, herb1Name);
      await archiveHerbViaUi(page, adminToken, herb2Id, herb2Name);
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
