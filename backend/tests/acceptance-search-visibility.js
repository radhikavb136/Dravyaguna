/**
 * CLI entry for Phase 1 acceptance (same logic as 29-acceptance-search-visibility.test.js).
 * Usage: node tests/acceptance-search-visibility.js
 * Optional: ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55 for approved dev dataset baseline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { assertTestDatabaseAllowed } from './lib/safety.js';
import { run } from './29-acceptance-search-visibility.test.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileEnv = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (fileEnv.DEV_DB_REF) process.env.DEV_DB_REF = fileEnv.DEV_DB_REF;
if (fileEnv.DEV_USER_PASSWORD) process.env.DEV_USER_PASSWORD = fileEnv.DEV_USER_PASSWORD;
assertTestDatabaseAllowed();

try {
  await run();
  console.log('PASS  acceptance-search-visibility (baseline-relative  N → N → N+1 → N+1 → N)');
} catch (error) {
  console.error('FAIL  acceptance-search-visibility');
  console.error(`  ${error.message}`);
  process.exitCode = 1;
}
