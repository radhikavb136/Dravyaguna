import { devPassword, DEV_USERS } from './api.js';

const ROLE_EMAIL = {
  admin: DEV_USERS.admin,
  editor: DEV_USERS.editor,
  expert: DEV_USERS.expert,
  clinician: DEV_USERS.clinician,
};

export function attachPageDiagnostics(page) {
  const consoleErrors = [];
  const failedRequests = [];

  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!url.includes('/api/')) return;
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${url}`);
    }
  });

  return {
    assertClean() {
      if (consoleErrors.length) {
        throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
      }
      if (failedRequests.length) {
        throw new Error(`Failed API responses: ${failedRequests.join(' | ')}`);
      }
    },
    ignoreApiFailures() {
      failedRequests.length = 0;
    },
  };
}

export async function loginViaUi(page, role) {
  const email = ROLE_EMAIL[role];
  if (!email) throw new Error(`Unknown role ${role}`);

  await page.goto('/auth');
  await page.getByRole('button', { name: 'Log In', exact: true }).first().click();

  const roleButton =
    role === 'admin'
      ? page.locator('button.role-option').filter({ hasText: 'Admin' })
      : page.locator('button.role-option').filter({ hasText: 'Doctor' });
  await roleButton.click();

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(devPassword());
  await page.locator('form.auth-form').getByRole('button', { name: 'Log In', exact: true }).click();

  if (role === 'clinician') {
    await page.waitForURL('**/doctor**', { timeout: 20_000 });
  } else {
    await page.waitForURL('**/admin**', { timeout: 20_000 });
  }
}
