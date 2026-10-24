import { test, expect } from '@playwright/test';

const runE2E = process.env.E2E_RUN === 'true';
const password = process.env.DEV_USER_PASSWORD || 'Dev1234567';

test.describe('Phase 2 admin pages', () => {
  test.skip(!runE2E, 'Set E2E_RUN=true with API/frontend running and DEV_USER_PASSWORD configured');

  test('clinician is denied admin user management', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('requestfailed', (req) => errors.push(`failed ${req.url()}`));

    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('dev-clinician@test.com');
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.goto('/admin/users');
    await expect(page.getByText(/access denied|not authorized|permission/i)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('admin loads user management', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('requestfailed', (req) => errors.push(`failed ${req.url()}`));

    await page.goto('/auth');
    await page.getByLabel(/email/i).fill('dev-admin@test.com');
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /user & role management/i })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
