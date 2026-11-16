import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });

const cols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'herbs'
  ORDER BY ordinal_position
`);
let migrations = [];
try {
  const mig = await pool.query('SELECT name FROM pgmigrations ORDER BY run_on');
  migrations = mig.rows.map((r) => r.name);
} catch (error) {
  migrations = [`(pgmigrations query failed: ${error.message})`];
}
await pool.end();

console.log(
  JSON.stringify(
    {
      has_identification_notes: cols.rows.some((r) => r.column_name === 'identification_notes'),
      herbs_column_count: cols.rows.length,
      latest_migrations: migrations.slice(-5),
    },
    null,
    2,
  ),
);
