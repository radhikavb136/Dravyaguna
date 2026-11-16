import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Playwright runs globalSetup before webServer starts.
 * Seed local dev users via DB only (no API required).
 */
export default async function globalSetup() {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.join(root, '..', 'backend');
  const databaseUrl =
    process.env.E2E_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';

  if (databaseUrl.includes('supabase') || databaseUrl.includes('pooler')) {
    throw new Error('Refusing E2E global setup against Supabase/pooler DATABASE_URL');
  }
  if (!databaseUrl.includes('127.0.0.1') && !databaseUrl.includes('localhost')) {
    throw new Error('E2E global setup requires a local DATABASE_URL');
  }

  execFileSync('node', ['scripts/seedDevUsers.js'], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DEV_USER_PASSWORD: process.env.DEV_USER_PASSWORD || 'Dev1234567',
      NODE_ENV: 'development',
    },
  });

  console.log('E2E global setup: dev users upserted (local seed script, no API).');
}
