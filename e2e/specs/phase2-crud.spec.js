import { test, expect } from '@playwright/test';
import {
  apiLogin,
  createVocabularyTerm,
  deleteVocabularyTerm,
  DEV_USERS,
  getScoringWeights,
  mergeVocabularyTermsAdmin,
  setUserStatus,
  updateScoringWeights,
} from '../helpers/api.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';
import { SCORING_SAVE, SCORING_SAVED, SCORING_TITLE } from '../helpers/i18nMatchers.js';

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
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`API not ready at ${apiURL}`);
});

test.describe('Phase 2 — admin CRUD flows', () => {
  test('admin creates user via UI and deactivates via API cleanup', async ({ page }) => {
    const stamp = Date.now();
    const email = `zz_e2e_user_${stamp}@example.com`;
    const password = 'E2ePass12345';
    const diag = attachPageDiagnostics(page);

    await loginViaUi(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /User & Role Management/i })).toBeVisible();

    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByRole('dialog', { name: 'Create user' })).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Create user' });
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.locator('input[type="password"]').fill(password);
    await dialog.getByLabel('Full name').fill(`ZZ E2E User ${stamp}`);
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 15_000 });
    diag.assertClean();

    const admin = await apiLogin(DEV_USERS.admin);
    const list = await fetch(`${apiURL}/api/users`, {
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' },
    });
    const users = await list.json();
    const created = (users.data || []).find((u) => u.email === email.toLowerCase());
    expect(created?.id).toBeTruthy();

    const deactivated = await setUserStatus(admin.token, created.id, 'inactive');
    expect(deactivated.status).toBe(200);
  });

  test('admin adds custom Karma term in vocabulary UI', async ({ page }) => {
    const stamp = Date.now();
    const termName = `ZZ E2E Karma ${stamp}`;
    const admin = await apiLogin(DEV_USERS.admin);
    const diag = attachPageDiagnostics(page);

    await loginViaUi(page, 'admin');
    await page.goto('/admin/vocabulary');
    await page.getByRole('button', { name: 'Karma', exact: true }).click();
    await page.getByRole('button', { name: 'Add Term' }).click();
    await expect(page.getByRole('heading', { name: 'Add Vocabulary Term' })).toBeVisible();

    await page.locator('#vocabulary-category').selectOption('Karma');
    await page.locator('#vocabulary-term').fill(termName);
    await page.locator('.vocabulary-term-form').getByRole('button', { name: 'Add Term', exact: true }).click();

    await expect(page.getByText(termName, { exact: false })).toBeVisible({ timeout: 15_000 });
    diag.assertClean();

    const filters = await fetch(`${apiURL}/api/vocabulary/filters`, {
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' },
    });
    const body = await filters.json();
    const match = (body.karma || []).find((k) => k.canonical_en === termName);
    if (match?.id) {
      await deleteVocabularyTerm(admin.token, 'karma', match.id);
    }
  });

  test('admin applies audit log filters without page errors', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    await loginViaUi(page, 'admin');
    await page.goto('/admin/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 20_000 });

    const userSelect = page.locator('.audit-log-filter-card select').first();
    const optionCount = await userSelect.locator('option').count();
    if (optionCount > 1) {
      const value = await userSelect.locator('option').nth(1).getAttribute('value');
      if (value) await userSelect.selectOption(value);
    }

    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(
      page.locator('.audit-log-table, .no-audit-results, [role="status"]')
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Clear' }).click();
    diag.assertClean();
  });

  test('admin persists scoring weight change to database', async ({ page }) => {
    const admin = await apiLogin(DEV_USERS.admin);
    const before = await getScoringWeights(admin.token);
    expect(before.status).toBe(200);
    const originalKarma = before.data.weights.karma;

    await loginViaUi(page, 'admin');
    await page.goto('/admin/scoring');
    await expect(page.getByRole('heading', { name: SCORING_TITLE })).toBeVisible();

    const karmaRow = page.locator('tr', { has: page.locator('strong', { hasText: 'Karma' }) });
    const input = karmaRow.locator('.scoring-weight-input');
    const nextValue = originalKarma >= 99 ? originalKarma - 1 : originalKarma + 1;
    await input.fill(String(nextValue));
    const saveDone = page.waitForResponse(
      (response) =>
        response.url().includes('/api/scoring/weights/bulk') &&
        response.request().method() === 'PUT' &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.getByRole('button', { name: SCORING_SAVE }).click();
    await saveDone;
    await expect(
      page.getByRole('status').filter({ hasText: /configuration saved|स्कोरिंग.*सहेज|स्कोअरिंग.*जतन|अङ्कभाराः रक्षिताः/i })
    ).toBeVisible({ timeout: 15_000 });

    const after = await getScoringWeights(admin.token);
    expect(after.data.weights.karma).toBe(nextValue);

    await updateScoringWeights(admin.token, { ...after.data.weights, karma: originalKarma });
  });

  test('admin merges and deletes unused custom Karma terms', async ({ page }) => {
    const stamp = Date.now();
    const admin = await apiLogin(DEV_USERS.admin);
    const sourceName = `ZZ E2E Merge Src ${stamp}`;
    const targetName = `ZZ E2E Merge Tgt ${stamp}`;
    const source = await createVocabularyTerm(admin.token, 'karma', sourceName);
    const target = await createVocabularyTerm(admin.token, 'karma', targetName);
    expect(source.status).toBe(200);
    expect(target.status).toBe(200);

    const merged = await mergeVocabularyTermsAdmin(admin.token, source.data.id, target.data.id);
    expect(merged.status).toBe(200);

    page.on('dialog', (dialog) => dialog.accept());
    await loginViaUi(page, 'admin');
    await page.goto('/admin/vocabulary');
    await page.getByRole('button', { name: 'Karma', exact: true }).click();

    const filters = await fetch(`${apiURL}/api/vocabulary/filters`, {
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' },
    });
    const body = await filters.json();
    expect((body.karma || []).some((k) => k.canonical_en === sourceName)).toBe(false);
    expect((body.karma || []).some((k) => k.canonical_en === targetName)).toBe(true);

    const deleteName = `ZZ E2E Del ${stamp}`;
    const delTerm = await createVocabularyTerm(admin.token, 'karma', deleteName);
    await page.reload();
    await page.getByRole('button', { name: 'Karma', exact: true }).click();
    const row = page.locator('tr', { hasText: deleteName });
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 15_000 });
    await deleteVocabularyTerm(admin.token, 'karma', delTerm.data.id).catch(() => {});
    await deleteVocabularyTerm(admin.token, 'karma', target.data.id).catch(() => {});
  });
});
