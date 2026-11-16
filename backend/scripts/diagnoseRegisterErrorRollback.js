/**
 * Simulates register INSERT inside a transaction and rolls back (no net row change).
 * Prints only PostgreSQL error code/message (no credentials).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
const client = await pool.connect();
const email = `zz_diag_register_${Date.now()}@example.com`;
const hash = await bcrypt.hash('DiagRegisterPass1234', 12);

try {
  await client.query('BEGIN');
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)`,
    [email, hash, 'ZZ Diag Register', 'clinician'],
  );
  await client.query('ROLLBACK');
  console.log(JSON.stringify({ register_insert_probe: 'PASS_ROLLBACK', email_used: email }, null, 2));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.log(
    JSON.stringify(
      {
        register_insert_probe: 'FAIL',
        pg_code: error.code,
        message: error.message,
        detail: error.detail || null,
        schema: error.schema || null,
        table: error.table || null,
        column: error.column || null,
      },
      null,
      2,
    ),
  );
} finally {
  client.release();
  await pool.end();
}
