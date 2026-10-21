import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCommand, ['run', 'build'], {
  cwd: root,
  env: {
    ...process.env,
    VITE_USE_API: 'true',
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/',
  },
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

const assetsDir = path.join(root, 'dist', 'assets');
const bundles = (await readdir(assetsDir)).filter((name) => name.endsWith('.js'));
if (bundles.length === 0) throw new Error('Production build emitted no JavaScript bundle.');
const output = (await Promise.all(bundles.map((file) => readFile(path.join(assetsDir, file), 'utf8')))).join('\n');

const mockStorageKeys = [
  'favoriteHerbs',
  'scoringWeights',
  'herbSettings',
  'dravyaguna_users',
  'herbUsers',
  'herbUser',
];
const forbidden = mockStorageKeys.filter((key) => output.includes(key));
if (forbidden.length) {
  console.error(`API production bundle contains mock storage keys: ${forbidden.join(', ')}`);
  process.exit(1);
}

console.log(`PASS API production bundle excludes ${mockStorageKeys.length} mock persistence keys.`);
