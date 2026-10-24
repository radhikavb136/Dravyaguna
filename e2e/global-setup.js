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
  const databaseUrl = process.env.DATABASE_URL || process.env.E2E_DATABASE_URL || '';

  if (databaseUrl.includes('supabase') || databaseUrl.includes('pooler')) {
    throw new Error('Refusing E2E global setup against Supabase/pooler DATABASE_URL');
  }

  execFileSync('node', ['scripts/seedDevUsers.js'], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DEV_USER_PASSWORD: process.env.DEV_USER_PASSWORD || 'Dev1234567',
      NODE_ENV: 'development',
    },
  });

  console.log('E2E global setup: dev users upserted (local seed script, no API).');
}
