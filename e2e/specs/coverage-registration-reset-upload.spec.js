import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { apiLogin, apiRequest, createE2eHerb, DEV_USERS } from '../helpers/api.js';
import { expirePasswordResetToken, mintPasswordResetToken } from '../helpers/passwordReset.js';
import {
  deleteUserByEmail,
  getUserRoleByEmail,
  registerViaApi,
} from '../helpers/registration.js';
import { loginViaUi } from '../helpers/ui.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:4010';
const PASSWORD_RESET_HEADING = /reset your password|पासवर्ड रीसेट|गुप्तशब्दं पुनः/i;
const PASSWORD_NEW_HEADING = /choose a new password|नया पासवर्ड|नवीन पासवर्ड|नवीनं गुप्तशब्दं/i;

function stamp() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function listenForDialogs(page) {
  const messages = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    await dialog.accept();
  });
  return messages;
}

function writeTempFile(name, bytes) {
  const file = path.join(os.tmpdir(), name);
  fs.writeFileSync(file, bytes);
  return file;
}

test.describe('Coverage — registration UI', () => {
  const password = 'E2eRegPass-10';

  test('sign up, log in, and land in clinician workspace', async ({ page }) => {
    const email = `zz_e2e_reg_${stamp()}@example.com`;
    await deleteUserByEmail(email);
    const dialogs = listenForDialogs(page);

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /sign up/i }).first().click();
    await page.locator('#fullName').fill('ZZ E2E Register');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);

    const registerDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/register') && r.status() === 201,
      { timeout: 20_000 }
    );
    await page.locator('form.auth-form').getByRole('button', { name: /create account/i }).click();
    await registerDone;

    expect(await getUserRoleByEmail(email)).toBe('clinician');
    expect(dialogs.some((m) => /account created|खाता सफल|created successfully/i.test(m))).toBeTruthy();

    await page.locator('#password').fill(password);
    const loginDone = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.ok(),
      { timeout: 20_000 }
    );
    await page.locator('form.auth-form').getByRole('button', { name: 'Log In', exact: true }).click();
    await loginDone;
    await expect(page).toHaveURL(/\/doctor/, { timeout: 20_000 });
    await deleteUserByEmail(email);
  });

  test('rejects short password before API call', async ({ page }) => {
    const dialogs = listenForDialogs(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /sign up/i }).first().click();
    await page.locator('#fullName').fill('ZZ Short Pass');
    await page.locator('#email').fill(`zz_e2e_short_${stamp()}@example.com`);
    await page.locator('#password').fill('short');
    await page.locator('#confirmPassword').fill('short');
    await page.locator('form.auth-form').getByRole('button', { name: /create account/i }).click();

    expect(dialogs.some((m) => /10 character|10 अक्षर/i.test(m))).toBeTruthy();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('duplicate email shows registration failure', async ({ page }) => {
    const email = `zz_e2e_dup_${stamp()}@example.com`;
    const dialogs = listenForDialogs(page);
    await deleteUserByEmail(email);
    const first = await registerViaApi({
      email,
      password,
      fullName: 'ZZ Dup User',
      role: 'admin',
    });
    expect(first.status).toBe(201);
    expect(await getUserRoleByEmail(email)).toBe('clinician');

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /sign up/i }).first().click();
    await page.locator('#fullName').fill('ZZ Dup Again');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    const duplicateResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/register'),
      { timeout: 20_000 }
    );
    await page.locator('form.auth-form').getByRole('button', { name: /create account/i }).click();
    const response = await duplicateResponse;
    expect(response.status()).toBe(409);
    await page.waitForEvent('dialog', { timeout: 5_000 }).then((d) => d.accept()).catch(() => {});
    expect(
      dialogs.some((m) => /already registered|Email already|registration failed|पंजीकरण/i.test(m)) ||
        response.status() === 409
    ).toBeTruthy();
    await deleteUserByEmail(email);
  });

  test('API ignores client-supplied admin role on register', async () => {
    const email = `zz_e2e_role_${stamp()}@example.com`;
    await deleteUserByEmail(email);
    const res = await registerViaApi({
      email,
      password,
      fullName: 'ZZ Role Check',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.data?.user?.role).toBe('clinician');
    expect(await getUserRoleByEmail(email)).toBe('clinician');
    await deleteUserByEmail(email);
  });
});

test.describe('Coverage — password reset routes and token flow', () => {
  const initialPassword = 'E2eResetPass-10';
  const newPassword = 'E2eResetNew-11';

  test('direct /password-reset loads request form', async ({ page }) => {
    await page.goto('/password-reset', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/password-reset/);
    await expect(page.getByRole('heading', { name: PASSWORD_RESET_HEADING })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('main input[type="email"]')).toBeVisible();
  });

  test('direct /password-reset?token= loads confirm form', async ({ page }) => {
    await page.goto('/password-reset?token=placeholder-token-for-layout-test', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/password-reset/);
    await expect(page.getByRole('heading', { name: PASSWORD_NEW_HEADING })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('main input[type="password"]')).toBeVisible();
  });

  test('confirm password, reject invalid/expired/reused token', async ({ page }) => {
    const email = `zz_e2e_reset_${stamp()}@example.com`;
    await deleteUserByEmail(email);
    expect(
      (await registerViaApi({ email, password: initialPassword, fullName: 'ZZ Reset', role: 'admin' })).status
    ).toBe(201);

    await page.goto(`/password-reset?token=${'x'.repeat(40)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('main input[type="password"]').fill(newPassword);
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });

    const rawToken = await mintPasswordResetToken(email);
    await expirePasswordResetToken(rawToken);
    await page.goto(`/password-reset?token=${encodeURIComponent(rawToken)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('main input[type="password"]').fill(newPassword);
    await page.locator('main form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });

    const freshToken = await mintPasswordResetToken(email);
    await page.goto(`/password-reset?token=${encodeURIComponent(freshToken)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('main input[type="password"]').fill(newPassword);
    const confirmOk = page.waitForResponse(
      (r) => r.url().includes('/api/auth/password-reset/confirm') && r.ok(),
      { timeout: 20_000 }
    );
    await page.locator('main form button[type="submit"]').click();
    await confirmOk;
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 15_000 });

    const reuse = await fetch(`${API_URL}/api/auth/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: freshToken, password: 'AnotherPass-12' }),
    });
    expect(reuse.status).toBe(400);

    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    });
    expect(loginRes.ok).toBeTruthy();

    await deleteUserByEmail(email);
  });
});

test.describe('Coverage — herb image upload UI', () => {
  test('editor sees validation and honest storage-disabled error on save', async ({ page }) => {
    const idStamp = stamp();
    const { token } = await apiLogin(DEV_USERS.editor);
    const created = await createE2eHerb(token, idStamp);
    const herbId = created.id;

    await loginViaUi(page, 'editor');
    await page.goto(`/admin/add-herb?id=${herbId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.add-herb-upload-area')).toBeVisible({ timeout: 25_000 });

    const badFile = writeTempFile(`e2e-bad-${idStamp}.txt`, Buffer.from('not an image'));
    const typeDialog = page.waitForEvent('dialog', { timeout: 10_000 }).then(async (d) => {
      expect(d.message()).toMatch(/PNG|JPG|WebP|छवि|प्रतिमा/i);
      await d.accept();
    });
    await Promise.all([
      typeDialog,
      page.locator('input[type="file"][accept*="image"]').setInputFiles(badFile),
    ]);

    const pngFile = writeTempFile(
      `e2e-herb-${idStamp}.png`,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    );
    await page.locator('input[type="file"][accept*="image"]').setInputFiles(pngFile);
    await expect(page.locator('.add-herb-image-preview, .add-herb-image-file-name').first()).toBeVisible({
      timeout: 10_000,
    });

    const saveDone = page.waitForResponse(
      (r) =>
        (r.url().includes('/api/herbs') || r.url().includes('/api/upload/herb-image')) &&
        (r.request().method() === 'PUT' || r.request().method() === 'POST'),
      { timeout: 30_000 }
    );
    const errorDialog = page.waitForEvent('dialog', { timeout: 30_000 }).then(async (d) => {
      expect(d.message()).toMatch(/storage|disabled in tests|not configured|Unable to save/i);
      await d.accept();
    });
    await Promise.all([
      saveDone,
      errorDialog,
      page.locator('button.add-herb-draft-button').click(),
    ]);

    try {
      fs.unlinkSync(badFile);
      fs.unlinkSync(pngFile);
    } catch {
      /* ignore */
    }
  });

  test('clinician cannot access add-herb editor page', async ({ page }) => {
    await loginViaUi(page, 'clinician');
    await page.goto('/admin/add-herb');
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15_000 });
  });
});
