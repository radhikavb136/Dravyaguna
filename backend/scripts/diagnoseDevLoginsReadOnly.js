/**
 * Read-only: dev-*@test.com row status and whether default seed password matches (no secrets logged).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const parsed = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const databaseUrl = parsed.DATABASE_URL;
if (!databaseUrl) {
  console.log(JSON.stringify({ error: 'DATABASE_URL missing' }));
  process.exit(1);
}

const DEFAULT_SEED = 'Dev1234567';
const emails = [
  'dev-admin@test.com',
  'dev-editor@test.com',
  'dev-expert@test.com',
  'dev-clinician@test.com',
];

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const out = { dev_users: [] };
try {
  for (const email of emails) {
    const { rows } = await pool.query(
      `SELECT email, status::text AS status, role::text AS role,
              (password_hash IS NOT NULL) AS hash_present,
              length(password_hash) AS hash_len
       FROM users WHERE email = $1`,
      [email]
    );
    if (!rows[0]) {
      out.dev_users.push({ email, exists: false });
      continue;
    }
    const { rows: hashRows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    const hash = hashRows[0]?.password_hash;
    let matchesDefaultSeed = false;
    if (hash) {
      matchesDefaultSeed = await bcrypt.compare(DEFAULT_SEED, hash);
    }
    out.dev_users.push({
      email,
      exists: true,
      status: rows[0].status,
      role: rows[0].role,
      hash_present: rows[0].hash_present,
      hash_len: rows[0].hash_len,
      matches_default_seed_password: matchesDefaultSeed,
    });
  }
  console.log(JSON.stringify(out, null, 2));
} finally {
  await pool.end();
}
