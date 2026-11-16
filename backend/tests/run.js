import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import net from 'node:net';
import { assertTestDatabaseAllowed } from './lib/safety.js';
import { ensureIntegrationDataset } from './lib/ensureIntegrationDataset.js';
import { endTestPool, getTestPool } from './lib/testPool.js';

dotenv.config();

const embeddedTestUrl = 'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';

async function embeddedPostgresReachable() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: 54334, timeout: 500 }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

if (process.env.PREFER_EMBEDDED_TEST_DB !== '0' && !(process.env.DATABASE_URL || '').includes('127.0.0.1:54334')) {
  if (await embeddedPostgresReachable()) {
    process.env.DATABASE_URL = embeddedTestUrl;
  }
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const testDbUrl = process.env.DATABASE_URL || '';
if (testDbUrl.includes('127.0.0.1:54334') || testDbUrl.includes('localhost:54334')) {
  delete process.env.ACCEPTANCE_BASELINE_TIKTA_DEEPANA;
}

assertTestDatabaseAllowed();

await ensureIntegrationDataset();

const apiBase = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
try {
  const healthRes = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (healthRes.ok) {
    const health = await healthRes.json();
    if (health.llmProvider && health.llmProvider !== 'mock') {
      console.warn(
        `WARN: API at ${apiBase} reports llmProvider=${health.llmProvider}. ` +
          'Start integration API with: node scripts/startE2eApi.js (NODE_ENV=test) on port 4010.'
      );
    }
  }
} catch {
  console.warn(`WARN: Could not reach API health at ${apiBase}; HTTP integration tests may fail.`);
}

async function cleanupTestRecords() {
  const pool = getTestPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      DELETE FROM herbs
      WHERE code LIKE 'zz_test_%'
         OR code LIKE 'TEST_HERB_%'
         OR code LIKE 'ACCEPTANCE_TEST_%'
         OR code LIKE 'PHASE1_TEST_%'
         OR code LIKE 'UI_TEST_%'
         OR english_name ILIKE 'ZZ Test%'
    `);
    await client.query(`
      DELETE FROM karma_terms
      WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'
    `);
    await client.query(`
      DELETE FROM indication_terms
      WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'
    `);
    await client.query(`DELETE FROM term_synonyms WHERE text LIKE 'zz_test%' OR text LIKE 'zz test %'`);
    await client.query(`DELETE FROM support_requests WHERE message LIKE 'zz_test%'`);
    await client.query(`DELETE FROM search_events WHERE query_text LIKE 'zz_test_%' OR query_text LIKE 'zzqqqxvzzunmapped%'`);
    await client.query(`
      DELETE FROM users
      WHERE email LIKE 'zz_test_%'
         OR email IN ('admin@test.com', 'clinician@test.com', 'editor@test.com', 'expert@test.com')
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

await cleanupTestRecords();

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const files = (await readdir(testsDir))
  .filter((name) => name.endsWith('.test.js'))
  .sort();

let failed = 0;
const results = [];

for (const file of files) {
  const started = Date.now();
  try {
    const mod = await import(pathToFileURL(path.join(testsDir, file)).href);
    if (typeof mod.run !== 'function') {
      throw new Error(`${file} does not export run()`);
    }
    await mod.run();
    const ms = Date.now() - started;
    console.log(`PASS  ${file}  (${ms}ms)`);
    results.push({ file, ok: true });
  } catch (err) {
    failed += 1;
    const ms = Date.now() - started;
    console.error(`FAIL  ${file}  (${ms}ms)`);
    console.error(`  ${err.message}`);
    results.push({ file, ok: false });
  }
}

console.log('\n---');
console.log(`${results.filter((r) => r.ok).length} passed, ${failed} failed, ${results.length} total`);

await cleanupTestRecords();
await endTestPool();

if (failed > 0) {
  process.exit(1);
}
