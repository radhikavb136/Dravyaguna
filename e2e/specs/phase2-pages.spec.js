import { test, expect } from '@playwright/test';
import {
  apiLogin,
  archiveHerb,
  createE2eHerb,
  DEV_USERS,
  listHerbs,
  updateHerb,
  verifyHerb,
} from '../helpers/api.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';
import {
  ACCESS_DENIED,
  ADD_HERB_TITLE,
  ANALYTICS_TITLE,
  AUDIT_TITLE,
  COMPARE_TITLE,
  FAVORITES_TITLE,
  MANAGE_HERBS_TITLE,
  SCORING_TITLE,
  USERS_TITLE,
  VOCABULARY_TITLE,
} from '../helpers/i18nMatchers.js';

const apiURL = process.env.E2E_API_URL || 'http://localhost:4010';
const expectedDbHost = process.env.E2E_EXPECT_DB_HOST || '127.0.0.1:54334';

test.beforeAll(async () => {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      const response = await fetch(`${apiURL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const body = await response.json();
      if (body.database !== 'ok') throw new Error('database not ok');
      const endpoint = body.databaseEndpoint || '';
      if (endpoint.includes('supabase') || endpoint.includes('pooler')) {
        throw new Error(`refusing non-local database endpoint ${endpoint}`);
      }
      if (endpoint && endpoint !== expectedDbHost) {
        console.warn(`API databaseEndpoint=${endpoint} (expected ${expectedDbHost})`);
      }
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`API not ready at ${apiURL}`);
});

test.describe('Phase 2 — page access by role', () => {
  test('unauthenticated user is redirected to auth from herb library', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await page.goto('/herb-library');
    await expect(page).toHaveURL(/\/auth/);
    diag.assertClean();
  });

  test('wrong password shows login failure and stays on auth', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Log In', exact: true }).first().click();
    await page.locator('#email').fill(DEV_USERS.clinician);
    await page.locator('#password').fill('not-a-valid-password-xyz');
    await page.locator('form.auth-form').getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('admin: scoring, manage herbs, vocabulary, analytics, users, audit', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'admin');

    await page.goto('/admin/scoring');
    await expect(page.getByRole('heading', { name: SCORING_TITLE })).toBeVisible();
    await expect(page.getByText(/Live example|उदाहरण|उदाहरणात/i)).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/manage-herbs');
    await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/add-herb');
    await expect(page.getByRole('heading', { name: ADD_HERB_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/vocabulary');
    await expect(page.getByRole('heading', { name: VOCABULARY_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/search-analytics');
    await expect(page.getByRole('heading', { name: ANALYTICS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: USERS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/audit-log');
    await expect(page.getByRole('heading', { name: AUDIT_TITLE })).toBeVisible();
    diag.assertClean();
  });

  test('editor: manage herbs, add herb, vocabulary; denied users and audit', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'editor');

    await page.goto('/admin/manage-herbs');
    await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/add-herb');
    await expect(page.getByRole('heading', { name: ADD_HERB_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/vocabulary');
    await expect(page.getByRole('heading', { name: VOCABULARY_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/scoring');
    await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible();

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible();

    await page.goto('/admin/audit-log');
    await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible();
  });

  test('domain expert: scoring, analytics, herbs; denied users', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'expert');

    await page.goto('/admin/scoring');
    await expect(page.getByRole('heading', { name: SCORING_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/search-analytics');
    await expect(page.getByRole('heading', { name: ANALYTICS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/manage-herbs');
    await expect(page.getByRole('heading', { name: MANAGE_HERBS_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: ACCESS_DENIED })).toBeVisible();
  });

  test('clinician: favorites and compare; denied admin users', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'clinician');

    const { token } = await apiLogin(DEV_USERS.clinician);
    const list = await listHerbs(token);
    const herbId = list.data?.data?.[0]?.id;
    expect(herbId).toBeTruthy();

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { level: 1, name: FAVORITES_TITLE })).toBeVisible();
    diag.assertClean();

    await page.evaluate((id) => {
      localStorage.setItem('selectedCompareHerbs', JSON.stringify([id]));
    }, herbId);
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: COMPARE_TITLE })).toBeVisible();
    diag.assertClean();

    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/doctor/);
  });
});

test.describe('Phase 2 — API authorization and herb lifecycle', () => {
  test('unauthenticated API requests return 401', async () => {
    const response = await fetch(`${apiURL}/api/herbs?limit=1`, {
      headers: { Accept: 'application/json' },
    });
    expect(response.status).toBe(401);
  });

  test('editor cannot verify herb (403); expert can; verified edit returns reviewed', async () => {
    const stamp = Date.now();
    const editor = await apiLogin(DEV_USERS.editor);
    const expert = await apiLogin(DEV_USERS.expert);
    const admin = await apiLogin(DEV_USERS.admin);

    const herb = await createE2eHerb(editor.token, stamp);
    const herbId = herb.id;

    const deniedVerify = await verifyHerb(editor.token, herbId);
    expect(deniedVerify.status).toBe(403);

    const allowedVerify = await verifyHerb(expert.token, herbId);
    expect(allowedVerify.status).toBe(200);

    const reviewed = await updateHerb(editor.token, herbId, {
      english_name: `ZZ E2E Herb ${stamp} edited`,
      description: 'E2E edit after verify',
    });
    expect(reviewed.status).toBe(200);
    expect(reviewed.data.status).toBe('reviewed');

    const invalidDhatu = await updateHerb(editor.token, herbId, {
      dhatu: [{ term: 'rasa', score: 7 }],
    });
    expect(invalidDhatu.status).toBe(400);

    const archived = await archiveHerb(admin.token, herbId);
    expect(archived.status).toBe(200);
  });

  test('verified herb edit shows reviewed notice in UI', async ({ page }) => {
    const stamp = Date.now();
    const editor = await apiLogin(DEV_USERS.editor);
    const expert = await apiLogin(DEV_USERS.expert);
    const admin = await apiLogin(DEV_USERS.admin);

    const herb = await createE2eHerb(editor.token, stamp);
    await verifyHerb(expert.token, herb.id);

    await loginViaUi(page, 'editor');
    await page.goto(`/admin/add-herb?id=${herb.id}&mode=edit`);
    await expect(page.getByRole('heading', { name: 'Edit Herb' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Section 1.*Basic Information/i }).click();
    await page.locator('#herbNameEnglish').fill(`ZZ E2E UI ${stamp}`);
    const reviewedDialog = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    const dialog = await reviewedDialog;
    expect(dialog.message().toLowerCase()).toMatch(/verified|reviewed/);
    await dialog.accept();

    await archiveHerb(admin.token, herb.id);
  });
});
