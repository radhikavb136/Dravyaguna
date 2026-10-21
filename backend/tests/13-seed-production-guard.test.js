import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, assertEqual } from './lib/assert.js';

export async function run() {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/seedDevUsers.js');
  const result = spawnSync(process.execPath, [script], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });

  assertEqual(result.status, 1, 'dev-user seed refuses production');
  assert(result.stderr.includes('Cannot run seed script in production'), 'production refusal is explicit');
  assert(!result.stdout.includes('DATABASE_URL'), 'seed refusal does not print database configuration');
}
