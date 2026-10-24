import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5180';
const apiURL = process.env.E2E_API_URL || 'http://localhost:4000';

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.js',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(process.env.E2E_BROWSER_CHANNEL
      ? { channel: process.env.E2E_BROWSER_CHANNEL }
      : {}),
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'node scripts/startE2eApi.js',
          cwd: '../backend',
          url: `${apiURL}/api/health`,
          reuseExistingServer: !process.env.E2E_FORCE_NEW_SERVERS,
          timeout: 120_000,
        },
        {
          command: 'npm run dev:local',
          cwd: '..',
          url: baseURL,
          reuseExistingServer: !process.env.E2E_FORCE_NEW_SERVERS,
          timeout: 120_000,
        },
      ],
});
