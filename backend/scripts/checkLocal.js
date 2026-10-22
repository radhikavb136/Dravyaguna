import { execFileSync } from 'node:child_process';

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
    return response.ok && body?.status === 'ok' && body?.database === 'ok';
  } catch {
    return false;
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
        } catch { /* Keep PID and report an unknown name. */ }
      }
      return `PID ${pid} (${name})`;
    });
    return `${item}: ${processes.join(', ')}`;
  }).join('; ');
}

const [localhostHealth, ipv4Health] = await Promise.all([health('localhost'), health('127.0.0.1')]);
console.log(`Backend health: localhost=${localhostHealth ? 'OK' : 'FAIL'}, 127.0.0.1=${ipv4Health ? 'OK' : 'FAIL'}`);

const corsResults = await Promise.all(origins.map(async (origin) => `${origin}=${await preflight(origin) ? 'PASS' : 'FAIL'}`));
console.log(`CORS dev origins: ${corsResults.join(', ')}`);
console.log(`Port owners: ${portOwners([4000, 5173, 5180])}`);
