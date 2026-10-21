/**
 * Updates the four documented dev users to the 10+ character seed password.
 * Does not print the password. Refuses production / PROD_DB_REF.
 */
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pg from 'pg';

dotenv.config();

const EMAILS = [
  'dev-admin@test.com',
  'dev-editor@test.com',
  'dev-expert@test.com',
  'dev-clinician@test.com',
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to set dev passwords when NODE_ENV=production');
  }
  const prodRef = process.env.PROD_DB_REF || '';
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  const usernameMatch = decodeURIComponent(databaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
  const databaseProjectRef = usernameMatch ? usernameMatch[1] : '';
  const devRef = process.env.DEV_DB_REF || '';
  if (prodRef && ((process.env.DATABASE_URL || '').includes(prodRef) || databaseProjectRef === prodRef)) {
    throw new Error('Refusing to set dev passwords against the production database');
  }
  if (!devRef || databaseProjectRef !== devRef) {
    throw new Error('DEV_DB_REF must exactly match the Supabase project ref for this database');
  }

  const password = process.env.DEV_USER_PASSWORD || 'Dev1234567';
  if (password.length < 10) {
    throw new Error('DEV_USER_PASSWORD must be at least 10 characters');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    for (const email of EMAILS) {
      const { rowCount } = await client.query(
        `UPDATE users SET password_hash = $1 WHERE email = $2`,
        [hash, email]
      );
      console.log(`${email}: ${rowCount === 1 ? 'updated' : 'not found'}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
