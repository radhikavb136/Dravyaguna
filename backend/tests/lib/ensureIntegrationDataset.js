import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestPool } from './testPool.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function isLocalIntegrationDb(url) {
  const lower = String(url || '').toLowerCase();
  return lower.includes('127.0.0.1:54334') || lower.includes('localhost:54334');
}

async function datasetLooksHealthy(pool) {
  const { rows: mala } = await pool.query('SELECT COUNT(*)::int AS count FROM mala_terms');
  if (mala[0].count < 1) {
    return false;
  }
  const { rows: junction } = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM herbs h
    JOIN herb_srotas hs ON hs.herb_id = h.id
    WHERE h.code = 'HERB_REC_0001'
  `);
  return junction[0].count >= 7;
}

function runScript(scriptName, args = []) {
  const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL };
  const script = path.join(backendRoot, 'scripts', scriptName);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: backendRoot,
    env,
    stdio: 'inherit',
  });
  return result.status === 0;
}

/**
 * Repairs local integration data without wiping admin-created herbs unless the DB is empty
 * or INTEGRATION_DATASET_REPAIR=fresh is set explicitly.
 */
export async function ensureIntegrationDataset() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!isLocalIntegrationDb(dbUrl)) {
    return;
  }

  const pool = getTestPool();
  if (await datasetLooksHealthy(pool)) {
    return;
  }

  console.warn('WARN: Integration vocabulary/junction data incomplete on local 54334; attempting safe repair.');

  if (!runScript('ensureBaselineVocabulary.js')) {
    throw new Error('ensureBaselineVocabulary.js failed');
  }

  if (await datasetLooksHealthy(pool)) {
    return;
  }

  const { rows: herbCount } = await pool.query('SELECT COUNT(*)::int AS count FROM herbs');
  const allowFresh =
    herbCount[0].count === 0 || process.env.INTEGRATION_DATASET_REPAIR === 'fresh';

  if (!allowFresh) {
    console.warn(
      'WARN: Skipping destructive dataset re-import because herbs already exist. ' +
        'Set INTEGRATION_DATASET_REPAIR=fresh to force importFromFrontendDataset.js --fresh.'
    );
    return;
  }

  if (!runScript('importFromFrontendDataset.js', ['--fresh'])) {
    throw new Error('importFromFrontendDataset.js --fresh failed');
  }
  if (!runScript('seedDevUsers.js')) {
    throw new Error('seedDevUsers.js failed after dataset import');
  }
}
