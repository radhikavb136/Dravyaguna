import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, assertEqual } from './lib/assert.js';

export async function run() {
  const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = spawnSync(process.execPath, [path.join(backendDir, 'scripts/createFirstAdmin.js')], {
    cwd: backendDir,
    input: 'admin@example.invalid\nStaging Admin\n',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54333/dravyaguna',
      NODE_ENV: 'test',
    },
    encoding: 'utf8',
  });

  assertEqual(result.status, 1, 'first-admin script refuses non-interactive password entry');
  assert(result.stderr.includes('A terminal is required'), 'first-admin script requires hidden terminal input');
  assert(!result.stdout.includes('admin@example.invalid'), 'first-admin script does not echo entered account data');
}
