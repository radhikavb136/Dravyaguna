import { defineConfig } from '@playwright/test';

const defaultApiPort = process.env.E2E_API_PORT || '4010';
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5180';
const apiURL = process.env.E2E_API_URL || `http://localhost:${defaultApiPort}`;
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';

function assertLocalE2eDatabase(url) {
  const lower = String(url || '').toLowerCase();
  if (!lower) {
    throw new Error('E2E requires E2E_DATABASE_URL (local isolated Postgres, e.g. 127.0.0.1:54334)');
  }
  if (lower.includes('supabase') || lower.includes('pooler.supabase.com')) {
    throw new Error('E2E refuses Supabase/pooler DATABASE_URL');
  }
  if (!lower.includes('127.0.0.1') && !lower.includes('localhost')) {
    throw new Error('E2E DATABASE_URL must be localhost/127.0.0.1');
  }
}

assertLocalE2eDatabase(e2eDatabaseUrl);

const sharedWebEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: e2eDatabaseUrl,
  DEV_USER_PASSWORD: process.env.DEV_USER_PASSWORD || 'Dev1234567',
  DISABLE_RATE_LIMIT: 'true',
  FRONTEND_ORIGIN:
    process.env.FRONTEND_ORIGIN ||
    'http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180',
};

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.js',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Set E2E_BROWSER_CHANNEL=msedge (or chrome) when bundled Chromium cannot be installed.
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
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            ...process.env,
            ...sharedWebEnv,
            PORT: new URL(apiURL).port || defaultApiPort,
          },
        },
        {
          command: 'npm run dev:local',
          cwd: '..',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            ...process.env,
            VITE_API_BASE_URL: apiURL,
            VITE_USE_API: 'true',
          },
        },
      ],
});
