import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { databaseEndpointFromUrl } from '../src/utils/databaseEndpoint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const port = Number(process.env.PORT || 4000);
const origins = [
  'http://localhost:5173',
  'http://localhost:5180',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5180',
];

async function health(host) {
  try {
    const response = await fetch(`http://${host}:${port}/api/health`, { signal: AbortSignal.timeout(1800) });
    const body = await response.json();
    return {
      ok: response.ok && body?.status === 'ok' && body?.database === 'ok',
      body,
    };
  } catch {
    return { ok: false, body: null };
  }
}

async function preflight(origin) {
  try {
    const response = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(1800),
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const headers = (response.headers.get('access-control-allow-headers') || '').toLowerCase();
    const methods = (response.headers.get('access-control-allow-methods') || '').toUpperCase();
    return response.status >= 200 && response.status < 300
      && response.headers.get('access-control-allow-origin') === origin
      && headers.includes('authorization') && headers.includes('content-type')
      && methods.includes('POST');
  } catch {
    return false;
  }
}

function portOwners(ports) {
  let output = '';
  try {
    output = execFileSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true });
  } catch {
    return ports.map((item) => `${item}: unavailable`).join('; ');
  }

  const owners = new Map(ports.map((item) => [item, new Set()]));
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 5 || fields[0] !== 'TCP' || fields[3] !== 'LISTENING') continue;
    for (const item of ports) {
      if (fields[1].endsWith(`:${item}`)) owners.get(item).add(fields[4]);
    }
  }

  return ports.map((item) => {
    const pids = [...owners.get(item)];
    if (!pids.length) return `${item}: none`;
    const processes = pids.map((pid) => {
      let name = 'unknown';
      if (/^\d+$/.test(pid) && process.platform === 'win32') {
        try {
          name = execFileSync('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-Command',
            `(Get-Process -Id ${pid} -ErrorAction Stop).ProcessName`,
          ], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim() || name;
        } catch { /* keep unknown */ }
      }
      return `PID ${pid} (${name})`;
    });
    return `${item}: ${processes.join(', ')}`;
  }).join('; ');
}

async function printDatabaseDiagnostics(runningEndpoint) {
  const envEndpoint = databaseEndpointFromUrl(process.env.DATABASE_URL);
  console.log(`Backend .env DATABASE_URL endpoint: ${envEndpoint || 'invalid or unset'}`);
  if (runningEndpoint) {
    console.log(`Running API reports databaseEndpoint: ${runningEndpoint}`);
    if (envEndpoint && runningEndpoint !== envEndpoint) {
      console.log('WARNING: backend/.env endpoint does not match the running API (process may have been started with different env).');
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('Database counts: skipped (DATABASE_URL unset in backend/.env)');
    return;
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { rows: userRows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    console.log(`Users (public.users): ${userRows[0].count}`);

    const { rows: herbRows } = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM herbs GROUP BY status ORDER BY status'
    );
    const herbSummary = herbRows.map((row) => `${row.status}=${row.count}`).join(', ') || 'none';
    console.log(`Herbs by status: ${herbSummary}`);

    const { rows: missingRls } = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = false
      ORDER BY tablename
    `);
    if (missingRls.length) {
      console.log(`RLS: FAIL (${missingRls.length} public tables without RLS: ${missingRls.map((r) => r.tablename).join(', ')})`);
    } else {
      console.log('RLS: all public tables enabled');
    }
  } catch (error) {
    console.log(`Database counts: FAIL (${error.code === 'ECONNREFUSED' ? 'connection refused' : 'query failed'})`);
  } finally {
    await pool.end();
  }
}

const [localhostHealth, ipv4Health] = await Promise.all([health('localhost'), health('127.0.0.1')]);
console.log(`Backend health: localhost=${localhostHealth.ok ? 'OK' : 'FAIL'}, 127.0.0.1=${ipv4Health.ok ? 'OK' : 'FAIL'}`);

const runningBody = localhostHealth.ok ? localhostHealth.body : (ipv4Health.ok ? ipv4Health.body : null);
await printDatabaseDiagnostics(runningBody?.databaseEndpoint || null);

const corsResults = await Promise.all(origins.map(async (origin) => `${origin}=${await preflight(origin) ? 'PASS' : 'FAIL'}`));
console.log(`CORS dev origins: ${corsResults.join(', ')}`);
console.log(`Port owners: ${portOwners([4000, 5173, 5180])}`);
