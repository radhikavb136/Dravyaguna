import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { assertTestDatabaseAllowed } from './lib/safety.js';

dotenv.config();

assertTestDatabaseAllowed();

async function cleanupTestRecords() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
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
    await pool.end();
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

if (failed > 0) {
  process.exit(1);
}
