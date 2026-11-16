import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const endpoint = new URL(env.DATABASE_URL);

function likelySource(email) {
  if (email.startsWith('zz_smoke_reg_')) return 'supabaseRegisterSmoke.js (or prior smoke run)';
  if (email.startsWith('zz_api_diag_')) return 'HTTP register probe during auth diagnosis (2026-10-24)';
  if (email.startsWith('zz_diag_register_')) return 'register INSERT rollback probe (if run)';
  if (/^zz_diag_\d+@example\.com$/.test(email)) return 'in-process registerUser() probe during auth diagnosis';
  if (email.startsWith('zz_test_register_')) return 'backend integration test (01-auth.test.js pattern)';
  return 'unknown zz_* diagnostic pattern';
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
const { rows } = await pool.query(`
  SELECT email, role::text AS role, status::text AS status, created_at
  FROM users
  WHERE email LIKE 'zz_%@example.com'
  ORDER BY created_at
`);
await pool.end();

console.log(
  JSON.stringify(
    {
      target: {
        hostname: endpoint.hostname,
        port: endpoint.port || '5432',
        is_supabase_pooler: endpoint.hostname.includes('pooler.supabase.com'),
      },
      diagnostic_users: rows.map((r) => ({
        email: r.email,
        role: r.role,
        status: r.status,
        created_at: r.created_at,
        likely_source: likelySource(r.email),
      })),
    },
    null,
    2,
  ),
);
