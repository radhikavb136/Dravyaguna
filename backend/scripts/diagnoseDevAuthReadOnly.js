/**
 * Read-only auth diagnosis for Supabase dev (no secrets printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2 });

function bcryptLooksValid(hash) {
  return typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash);
}

try {
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `);

  const devUsers = await pool.query(`
    SELECT email, role::text AS role, status::text AS status,
           (password_hash IS NOT NULL AND length(password_hash) > 0) AS password_hash_present,
           length(password_hash) AS password_hash_length
    FROM users
    WHERE email LIKE 'dev-%@test.com'
    ORDER BY email
  `);

  const devUsersSafe = [];
  for (const row of devUsers.rows) {
    const hashRow = await pool.query('SELECT password_hash FROM users WHERE email = $1', [row.email]);
    const hash = hashRow.rows[0]?.password_hash;
    devUsersSafe.push({
      email: row.email,
      role: row.role,
      status: row.status,
      password_hash_present: row.password_hash_present,
      password_hash_length: row.password_hash_length,
      bcrypt_format_valid: bcryptLooksValid(hash),
    });
  }

  const policies = await pool.query(`
    SELECT policyname, cmd, roles, permissive
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY policyname
  `);

  const rls = await pool.query(`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE oid = 'public.users'::regclass
  `);

  const jwtSecretPresent = Boolean((env.JWT_SECRET || '').trim());
  const jwtExpires = env.JWT_EXPIRES_IN || '(unset)';

  const loginProbe = [];
  for (const row of devUsers.rows.slice(0, 4)) {
    const full = await pool.query(
      'SELECT id, email, password_hash, role::text AS role, status::text AS status FROM users WHERE email = $1',
      [row.email],
    );
    const user = full.rows[0];
    const probe = { email: user.email, status: user.status, steps: [] };
    probe.steps.push({ step: 'row_found', ok: Boolean(user) });
    probe.steps.push({ step: 'status_active', ok: user?.status === 'active' });
    probe.steps.push({
      step: 'bcrypt_format',
      ok: bcryptLooksValid(user?.password_hash),
    });
    try {
      await bcrypt.compare('probe-only-not-real-password', user?.password_hash || '');
      probe.steps.push({ step: 'bcrypt_compare_no_throw', ok: true });
    } catch (err) {
      probe.steps.push({ step: 'bcrypt_compare_no_throw', ok: false, error: err.message });
    }
    if (jwtSecretPresent && user?.id) {
      try {
        jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
          subject: user.id,
          expiresIn: env.JWT_EXPIRES_IN || '8h',
        });
        probe.steps.push({ step: 'jwt_sign', ok: true });
      } catch (err) {
        probe.steps.push({ step: 'jwt_sign', ok: false, error: err.message });
      }
    } else {
      probe.steps.push({ step: 'jwt_sign', ok: false, error: 'JWT_SECRET missing in .env' });
    }
    loginProbe.push(probe);
  }

  console.log(
    JSON.stringify(
      {
        users_columns: columns.rows.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable,
        })),
        dev_test_users: devUsersSafe,
        users_rls: rls.rows[0] || null,
        users_policies_count: policies.rows.length,
        users_policies: policies.rows,
        jwt_secret_configured: jwtSecretPresent,
        jwt_expires_in: jwtExpires,
        login_path_probe: loginProbe,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('DIAGNOSE_FAILED', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
