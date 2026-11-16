/**
 * Acceptance Test 6 — profile, settings preferences, password change (UI + API).
 */
import { test, expect } from '@playwright/test';
import { DEV_USERS, devPassword, getAccountApi, loginWithPassword } from '../helpers/api.js';
import {
  PROFILE_TITLE,
  SETTINGS_CHANGE_PASSWORD,
  SETTINGS_PASSWORD_UPDATED,
  SETTINGS_SAVE_SUCCESS,
} from '../helpers/i18nMatchers.js';
import { attachPageDiagnostics, loginViaUi } from '../helpers/ui.js';

const TEMP_PASSWORD = 'E2ePassChg-10';

async function openNavbarMenu(page) {
  await page.locator('button.navbar-profile').click();
}

async function navigateViaMenu(page, labelRegex) {
  await openNavbarMenu(page);
  await page.locator('.profile-dropdown-menu .profile-menu-item').filter({ hasText: labelRegex }).click();
}

function wirePasswordPrompts(page, currentPassword, newPassword) {
  let step = 0;
  const handler = async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(step === 0 ? currentPassword : newPassword);
    step += 1;
  };
  page.on('dialog', handler);
  return () => page.off('dialog', handler);
}

test.describe('Acceptance 6 — profile and settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Tests A–C — profile, preferences, password, session', async ({ page }) => {
    const diag = attachPageDiagnostics(page);
    const seededPassword = devPassword();
    let tokenBeforePassword = '';
    let originalSavedReminders = null;

    await test.step('A1–A4. Clinician opens profile and settings via UI', async () => {
      await loginViaUi(page, 'clinician');

      await navigateViaMenu(page, /profile|प्रोफ़ाइल|प्रोफाइल|परिचय/i);
      await expect(page).toHaveURL(/\/profile/);
      await expect(page.getByRole('heading', { name: PROFILE_TITLE })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('#fullName')).toHaveValue(/dev clinician/i);
      await expect(page.getByText(DEV_USERS.clinician)).toBeVisible();

      await page.locator('button.profile-close-button').click();
      await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });

      await navigateViaMenu(page, /settings|सेटिंग|व्यवस्था/i);
      await expect(page).toHaveURL(/\/settings/);
      await expect(page.locator('.settings-save-footer')).toBeVisible();
    });

    await test.step('A5–A7. Toggle saved-reminders preference, persist, restore', async () => {
      const clinicianToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const before = await getAccountApi(clinicianToken);
      expect(before.status).toBe(200);
      originalSavedReminders = before.data?.data?.preferences?.savedReminders ?? false;

      await page.locator('.settings-modal-sidebar button').filter({ hasText: /notification|सूचन/i }).click();
      const toggle = page.locator('.settings-panel-content button.settings-toggle').nth(1);
      const wasOn = await toggle.evaluate((el) => el.classList.contains('on'));
      await toggle.click();
      const wantOn = !wasOn;

      const prefsDone = page.waitForResponse(
        (r) => r.url().includes('/api/account/preferences') && r.request().method() === 'PATCH' && r.ok(),
        { timeout: 20_000 }
      );
      await page.locator('button.settings-save-button').click();
      await prefsDone;
      await expect(page.getByText(SETTINGS_SAVE_SUCCESS)).toBeVisible();

      let token = await page.evaluate(() => localStorage.getItem('auth_token'));
      let fromApi = await getAccountApi(token);
      expect(fromApi.data?.data?.preferences?.savedReminders).toBe(wantOn);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('button.settings-save-button')).toBeVisible({ timeout: 20_000 });
      await page.locator('.settings-modal-sidebar button').filter({ hasText: /notification|सूचन/i }).click();
      const toggleAfter = page.locator('.settings-panel-content button.settings-toggle').nth(1);
      if (wantOn) await expect(toggleAfter).toHaveClass(/on/);
      else await expect(toggleAfter).not.toHaveClass(/on/);

      if (wantOn !== originalSavedReminders) {
        await toggleAfter.click();
        await page.locator('button.settings-save-button').click();
        await page.waitForResponse(
          (r) => r.url().includes('/api/account/preferences') && r.ok(),
          { timeout: 20_000 }
        );
        token = await page.evaluate(() => localStorage.getItem('auth_token'));
        fromApi = await getAccountApi(token);
        expect(fromApi.data?.data?.preferences?.savedReminders).toBe(originalSavedReminders);
      }
    });

    await test.step('B1–B7. Change password via UI prompts; verify auth; restore seeded password', async () => {
      await page.locator('.settings-modal-sidebar button').filter({ hasText: /account|खाता|खाते/i }).first().click();
      tokenBeforePassword = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenBeforePassword).toBeTruthy();

      const removePrompts = wirePasswordPrompts(page, seededPassword, TEMP_PASSWORD);
      const changeDone = page.waitForResponse(
        (r) => r.url().includes('/api/account/password') && r.request().method() === 'POST' && r.ok(),
        { timeout: 20_000 }
      );
      await page.locator('button.settings-text-button').filter({ hasText: SETTINGS_CHANGE_PASSWORD }).click();
      const changeResp = await changeDone;
      const body = await changeResp.json();
      expect(body.message).toMatch(/password updated successfully/i);
      await expect(page.getByText(SETTINGS_PASSWORD_UPDATED)).toBeVisible();
      removePrompts();

      const tokenAfterChange = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenAfterChange).toBe(tokenBeforePassword);
      const sessionAccount = await getAccountApi(tokenAfterChange);
      expect(sessionAccount.status).toBe(200);

      const newLogin = await loginWithPassword(DEV_USERS.clinician, TEMP_PASSWORD);
      expect(newLogin.status).toBe(200);
      expect(newLogin.data.token).toBeTruthy();

      const oldLogin = await loginWithPassword(DEV_USERS.clinician, seededPassword);
      expect(oldLogin.status).toBe(401);

      const restorePrompts = wirePasswordPrompts(page, TEMP_PASSWORD, seededPassword);
      const restoreDone = page.waitForResponse(
        (r) => r.url().includes('/api/account/password') && r.ok(),
        { timeout: 20_000 }
      );
      await page.locator('button.settings-text-button').filter({ hasText: SETTINGS_CHANGE_PASSWORD }).click();
      await restoreDone;
      restorePrompts();

      const backToSeed = await loginWithPassword(DEV_USERS.clinician, seededPassword);
      expect(backToSeed.status).toBe(200);
    });

    await test.step('C1–C3. Unauthenticated account APIs blocked (session policy verified in B)', async () => {
      const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:4010';
      const unauthGet = await fetch(`${apiURL}/api/account`);
      expect(unauthGet.status).toBe(401);

      const unauthPatch = await fetch(`${apiURL}/api/account/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { savedReminders: false } }),
      });
      expect(unauthPatch.status).toBe(401);
    });

    diag.ignoreApiFailures();
    diag.assertClean();
  });
});
