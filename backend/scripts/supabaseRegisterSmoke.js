/**
 * Registration → login persistence smoke (creates one zz_smoke_* user).
 * Requires running API and backend/.env DATABASE_URL (not printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fileEnv = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
process.env.DATABASE_URL = fileEnv.DATABASE_URL;
if (fileEnv.PORT) process.env.PORT = fileEnv.PORT;

const API = `http://127.0.0.1:${process.env.PORT || 4000}`;
const stamp = Date.now();
const email = `zz_smoke_reg_${stamp}@example.com`;
const password = 'SmokeTestPass1234';

const regRes = await fetch(`${API}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, fullName: 'ZZ Smoke Register', password }),
});
const regBody = await regRes.json().catch(() => ({}));
if (regRes.status !== 201) {
  console.error('REGISTER_FAIL', regRes.status, regBody.error || regBody);
  process.exit(1);
}

const loginRes = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginRes.json().catch(() => ({}));
if (loginRes.status !== 200 || !loginBody.token) {
  console.error('LOGIN_FAIL', loginRes.status, loginBody.error || loginBody);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const { rows } = await pool.query(
  'SELECT id, email, role::text AS role, status::text AS status FROM users WHERE email = $1',
  [email],
);

if (!rows[0]) {
  await pool.end();
  console.error('DB_PERSISTENCE_FAIL: user row not found');
  process.exit(1);
}

await pool.query('DELETE FROM users WHERE email = $1', [email]);
await pool.end();

console.log(
  JSON.stringify({
    result: 'PASS',
    register_status: 201,
    login_status: 200,
    db_row: { role: rows[0].role, status: rows[0].status },
    cleanup: 'deleted_only_this_run_email',
  }, null, 2),
);
