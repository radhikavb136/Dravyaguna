/**
 * Removes the four guarded dev seed accounts only.
 * Requires --confirm. Refuses production and PROD_DB_REF targets.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DEV_EMAILS = [
  'dev-admin@test.com',
  'dev-editor@test.com',
  'dev-expert@test.com',
  'dev-clinician@test.com',
];

if (!process.argv.includes('--confirm')) {
  console.error('ERROR: Pass --confirm to delete the four dev users.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Cannot remove dev users when NODE_ENV=production');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL || '';
const prodRef = process.env.PROD_DB_REF || '';
let databaseProjectRef = '';
try {
  const databaseUrl = new URL(dbUrl);
  const usernameMatch = decodeURIComponent(databaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
  databaseProjectRef = usernameMatch ? usernameMatch[1] : '';
} catch {
  databaseProjectRef = '';
}

if (prodRef && (dbUrl.includes(prodRef) || databaseProjectRef === prodRef)) {
  console.error('ERROR: DATABASE_URL matches PROD_DB_REF');
  process.exit(1);
}

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });

async function main() {
  const { rowCount } = await pool.query(
    'DELETE FROM users WHERE email = ANY($1::text[])',
    [DEV_EMAILS]
  );
  console.log(`Removed ${rowCount} dev user row(s).`);
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
