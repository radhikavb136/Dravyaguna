import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5180';
const apiURL = process.env.E2E_API_URL || 'http://localhost:4000';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'npm run start',
          cwd: '../backend',
          url: `${apiURL}/api/health`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: 'npm run dev:local',
          cwd: '..',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
