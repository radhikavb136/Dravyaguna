import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { assert, assertEqual } from './lib/assert.js';
import { BASE_URL } from './lib/http.js';
import { defaultFrontendOrigins, parseFrontendOrigin } from '../src/config/env.js';

export async function run() {
  assertEqual(
    parseFrontendOrigin(' http://one.test, ,http://two.test ,,').join('|'),
    'http://one.test|http://two.test',
    'comma separated origins are trimmed and empty items ignored'
  );
  assertEqual(
    parseFrontendOrigin(undefined).join('|'),
    defaultFrontendOrigins.join('|'),
    'development uses all four documented origins by default'
  );

  for (const origin of defaultFrontendOrigins) {
    const response = await fetch(`${BASE_URL}/api/health`, { headers: { Origin: origin } });
    assertEqual(response.headers.get('access-control-allow-origin'), origin, `allowed origin ${origin}`);
  }

  const denied = await fetch(`${BASE_URL}/api/health`, {
    headers: { Origin: 'http://untrusted.invalid' },
  });
  assertEqual(denied.headers.get('access-control-allow-origin'), null, 'disallowed origin gets no allow-origin header');

  const preflight = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5180',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  assert([200, 204].includes(preflight.status), `preflight succeeds (got ${preflight.status})`);
  assertEqual(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5180');
  assertEqual(preflight.headers.get('access-control-allow-credentials'), 'true');
  const allowedHeaders = (preflight.headers.get('access-control-allow-headers') || '').toLowerCase();
  assert(allowedHeaders.includes('authorization') && allowedHeaders.includes('content-type'), 'preflight permits Authorization and Content-Type');
  const allowedMethods = (preflight.headers.get('access-control-allow-methods') || '').toUpperCase();
  assert(allowedMethods.includes('POST') && allowedMethods.includes('GET') && allowedMethods.includes('PATCH'), 'preflight permits API methods');

  const configUrl = pathToFileURL(path.resolve('src/config/env.js')).href;
  for (const frontendOrigin of ['', '*']) {
    const source = `await import(${JSON.stringify(configUrl)})`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://127.0.0.1/unused',
        JWT_SECRET: 'local-test-only-placeholder',
        FRONTEND_ORIGIN: frontendOrigin,
      },
    });
    assert(result.status !== 0, `production startup rejects FRONTEND_ORIGIN=${frontendOrigin || '(empty)'}`);
    assert((result.stderr || '').includes('FRONTEND_ORIGIN'), 'production refusal explains the missing or wildcard origin config');
  }
}
