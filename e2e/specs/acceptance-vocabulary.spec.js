/**
 * Acceptance Test 8 — vocabulary management (create, merge, delete safeguards, roles).
 */
import { test, expect } from '@playwright/test';
import {
  apiLogin,
  archiveHerb,
  createE2eHerb,
  createVocabularyTerm,
  deleteVocabularyTerm,
  DEV_USERS,
  getVocabularyFilters,
  mergeVocabularyTerms,
  updateHerb,
  updateVocabularyTerm,
} from '../helpers/api.js';
import { VOCABULARY_TITLE } from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const PREFIX = 'ZZ ACC8';

async function clearSession(page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function openKarmaTab(page) {
  await page.goto('/admin/vocabulary');
  await expect(page.getByRole('heading', { name: VOCABULARY_TITLE })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Karma', exact: true }).click();
}

async function addKarmaTermViaUi(page, termName) {
  await openKarmaTab(page);
  await page.locator('.vocabulary-add-button, button').filter({ hasText: /add term/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Add Vocabulary Term' })).toBeVisible();
  await page.locator('#vocabulary-category').selectOption('Karma');
  await page.locator('#vocabulary-term').fill(termName);
  const createDone = page.waitForResponse(
    (r) => r.url().includes('/api/vocabulary/karma') && r.request().method() === 'POST' && r.ok(),
    { timeout: 20_000 }
  );
  await page.locator('.vocabulary-term-form').getByRole('button', { name: 'Add Term', exact: true }).click();
  await createDone;
}

function findKarmaTerm(filtersBody, name) {
  return (filtersBody.karma || []).find((k) => k.canonical_en === name);
}

test.describe('Acceptance 8 — vocabulary management', () => {
  const stamp = `${Date.now()}`;
  const termB = `${PREFIX} B ${stamp}`;
  const termSrc = `${PREFIX} Src ${stamp}`;
  const termTgt = `${PREFIX} Tgt ${stamp}`;
  const termDel = `${PREFIX} Del ${stamp}`;
  const termRef = `${PREFIX} Ref ${stamp}`;
  let termBId = null;
  let termSrcId = null;
  let termTgtId = null;
  let termDelId = null;
  let termRefId = null;
  let linkedHerbId = null;

  test('Tests A–E — vocabulary UI, merge, delete, roles', async ({ page }) => {
    test.setTimeout(120_000);
    const diag = attachPageDiagnostics(page);

    await test.step('B1–B5. Editor creates Karma term via UI; persists', async () => {
      await loginViaUi(page, 'editor');
      await addKarmaTermViaUi(page, termB);
      await expect(page.getByText(termB)).toBeVisible({ timeout: 15_000 });

      const editorToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      let filters = await getVocabularyFilters(editorToken);
      expect(filters.status).toBe(200);
      termBId = findKarmaTerm(filters.data, termB)?.id;
      expect(termBId).toBeTruthy();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await openKarmaTab(page);
      await expect(page.getByText(termB)).toBeVisible();
    });

    await test.step('C1–C4. Admin merges two test Karma terms via UI', async () => {
      const admin = await apiLogin(DEV_USERS.admin);
      const src = await createVocabularyTerm(admin.token, 'karma', termSrc);
      const tgt = await createVocabularyTerm(admin.token, 'karma', termTgt);
      expect(src.status).toBe(200);
      expect(tgt.status).toBe(200);
      termSrcId = src.data.id;
      termTgtId = tgt.data.id;

      await clearSession(page);
      await loginViaUi(page, 'admin');
      await openKarmaTab(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openKarmaTab(page);

      const srcRow = page.locator('tr', { hasText: termSrc });
      await expect(srcRow).toHaveCount(1);
      await srcRow.getByRole('button', { name: 'Merge' }).click();
      await page.locator('#merge-target').selectOption({ label: termTgt });
      const mergeDone = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().includes(`/api/vocabulary/karma/${termSrcId}/merge`) &&
          r.ok(),
        { timeout: 20_000 }
      );
      await page.getByRole('button', { name: 'Merge Terms' }).click();
      await mergeDone;
      await expect(page.getByText(/merged into/i)).toBeVisible({ timeout: 10_000 });

      const filters = await getVocabularyFilters(admin.token);
      expect(findKarmaTerm(filters.data, termSrc)).toBeFalsy();
      expect(findKarmaTerm(filters.data, termTgt)?.id).toBe(termTgtId);
      termSrcId = null;
    });

    await test.step('D1–D5. Delete unused term; block delete when herb references term', async () => {
      const admin = await apiLogin(DEV_USERS.admin);
      const del = await createVocabularyTerm(admin.token, 'karma', termDel);
      const ref = await createVocabularyTerm(admin.token, 'karma', termRef);
      termDelId = del.data.id;
      termRefId = ref.data.id;

      const editor = await apiLogin(DEV_USERS.editor);
      const herb = await createE2eHerb(editor.token, `acc8_${stamp}`);
      linkedHerbId = herb.id;
      const linked = await updateHerb(editor.token, linkedHerbId, { karma: [termRef] });
      expect(linked.status).toBe(200);

      await openKarmaTab(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openKarmaTab(page);

      page.on('dialog', (dialog) => dialog.accept());
      const delRow = page.locator('tr', { hasText: termDel });
      await delRow.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 15_000 });
      termDelId = null;

      const refRow = page.locator('tr', { hasText: termRef });
      await refRow.getByRole('button', { name: 'Delete' }).click();
      await expect(page.locator('[role="alert"]')).toContainText(/cannot delete|used by herbs|merge/i, {
        timeout: 15_000,
      });

      const stillThere = await getVocabularyFilters(admin.token);
      expect(findKarmaTerm(stillThere.data, termRef)?.id).toBe(termRefId);

      const blockedApi = await deleteVocabularyTerm(admin.token, 'karma', termRefId);
      expect(blockedApi.status).toBe(409);
    });

    await test.step('E1–E4. Role restrictions (UI + API)', async () => {
      const clinician = await apiLogin(DEV_USERS.clinician);
      const editor = await apiLogin(DEV_USERS.editor);
      const expert = await apiLogin(DEV_USERS.expert);
      const admin = await apiLogin(DEV_USERS.admin);

      await clearSession(page);
      await loginViaUi(page, 'clinician');
      await page.goto('/admin/vocabulary');
      await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });

      const clinicianCreate = await createVocabularyTerm(clinician.token, 'karma', `${PREFIX} deny ${stamp}`);
      expect(clinicianCreate.status).toBe(403);

      await clearSession(page);
      await loginViaUi(page, 'editor');
      await openKarmaTab(page);
      const editorRow = page.locator('tr', { hasText: termB });
      await expect(editorRow.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      const editorMerge = await mergeVocabularyTerms(editor.token, 'karma', termTgtId, termBId);
      expect(editorMerge.status).toBe(403);

      const editorPatch = await updateVocabularyTerm(editor.token, 'karma', termBId, `${termB} edited`);
      expect(editorPatch.status).toBe(403);

      const beforeEdit = await getVocabularyFilters(editor.token);
      expect(findKarmaTerm(beforeEdit.data, termB)?.canonical_en).toBe(termB);

      const expertDelete = await deleteVocabularyTerm(expert.token, 'karma', termBId);
      expect(expertDelete.status).toBe(403);

      const adminPatch = await updateVocabularyTerm(admin.token, 'karma', termBId, `${termB} AdminEdit`);
      expect(adminPatch.status).toBe(200);
      const afterAdminEdit = await getVocabularyFilters(admin.token);
      expect(findKarmaTerm(afterAdminEdit.data, `${termB} AdminEdit`)?.id).toBe(termBId);
      await updateVocabularyTerm(admin.token, 'karma', termBId, termB);
    });

    await test.step('Cleanup test artifacts only', async () => {
      const admin = await apiLogin(DEV_USERS.admin);
      if (linkedHerbId) await archiveHerb(admin.token, linkedHerbId).catch(() => {});
      if (termRefId) await deleteVocabularyTerm(admin.token, 'karma', termRefId).catch(() => {});
      if (termBId) await deleteVocabularyTerm(admin.token, 'karma', termBId).catch(() => {});
      if (termTgtId) await deleteVocabularyTerm(admin.token, 'karma', termTgtId).catch(() => {});
      if (termDelId) await deleteVocabularyTerm(admin.token, 'karma', termDelId).catch(() => {});
      if (termSrcId) await deleteVocabularyTerm(admin.token, 'karma', termSrcId).catch(() => {});
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
