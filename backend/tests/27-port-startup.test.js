import net from 'node:net';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { assert } from './lib/assert.js';

export async function run() {
  const blocker = net.createServer();
  await new Promise((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen({ port: 0, host: '::', ipv6Only: false }, resolve);
  });
  const port = blocker.address().port;
  try {
    const result = spawnSync(process.execPath, ['src/index.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 6000,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://127.0.0.1/unused',
        JWT_SECRET: 'local-test-only-placeholder',
        FRONTEND_ORIGIN: 'http://localhost:5180',
        PORT: String(port),
      },
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    assert(result.status !== 0, 'backend exits non-zero when its port is already occupied');
    assert(output.includes(`Port ${port} is already in use`), 'backend reports the occupied port');
    assert(!output.includes('Error: listen EADDRINUSE'), 'backend avoids an unhandled listen stack trace');
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
}
