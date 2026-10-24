/**
 * Dev-only seed script: creates one user per role
 * 
 * SAFETY CHECKS:
 * - Will NOT run if NODE_ENV=production
 * - Will NOT run if DATABASE_URL is not a dev database
 * 
 * Emails:
 * - dev-admin@test.com (admin)
 * - dev-editor@test.com (editor)
 * - dev-expert@test.com (domain_expert)
 * - dev-clinician@test.com (clinician)
 * 
 * Password for all: DEV_USER_PASSWORD or Dev1234567 (min 10 characters). Not printed.
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const supabaseDevMode = process.argv.includes('--supabase-dev');
const confirmed = process.argv.includes('--confirm');

if (supabaseDevMode && !confirmed) {
  console.error('ERROR: Supabase dev seed requires --confirm');
  process.exit(1);
}

// Safety check: prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Cannot run seed script in production (NODE_ENV=production)');
  process.exit(1);
}

// Safety check: prevent running against non-dev database
const dbUrl = process.env.DATABASE_URL || '';
const isDevDatabase = 
  dbUrl.includes('localhost') ||
  dbUrl.includes('127.0.0.1') ||
  dbUrl.includes('dev') ||
  dbUrl.includes('test') ||
  dbUrl.includes('.local');
const devRef = process.env.DEV_DB_REF || '';
let databaseProjectRef = '';
try {
  const databaseUrl = new URL(dbUrl);
  const usernameMatch = decodeURIComponent(databaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
  databaseProjectRef = usernameMatch ? usernameMatch[1] : '';
} catch {
  databaseProjectRef = '';
}
const isExplicitDevDatabase = Boolean(devRef && databaseProjectRef === devRef);

const prodRef = process.env.PROD_DB_REF || '';
if (prodRef && (dbUrl.includes(prodRef) || databaseProjectRef === prodRef)) {
  console.error('ERROR: DATABASE_URL matches PROD_DB_REF');
  process.exit(1);
}

if (supabaseDevMode) {
  if (!devRef || !dbUrl.includes(devRef)) {
    console.error('ERROR: Supabase dev seed requires DEV_DB_REF to be set and present in DATABASE_URL');
    process.exit(1);
  }
  if (!isExplicitDevDatabase) {
    console.error('ERROR: DATABASE_URL project ref must match DEV_DB_REF for Supabase dev seed');
    process.exit(1);
  }
} else if (!isDevDatabase && !isExplicitDevDatabase) {
  console.error('ERROR: DATABASE_URL does not appear to be a development database');
  console.error('Use a local dev URL or set DEV_DB_REF to the exact Supabase project ref.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SEED_PASSWORD = process.env.DEV_USER_PASSWORD || 'Dev1234567';
if (SEED_PASSWORD.length < 10) {
  console.error('ERROR: DEV_USER_PASSWORD must be at least 10 characters');
  process.exit(1);
}

const users = [
  { email: 'dev-admin@test.com', password: SEED_PASSWORD, full_name: 'Dev Admin', role: 'admin' },
  { email: 'dev-editor@test.com', password: SEED_PASSWORD, full_name: 'Dev Editor', role: 'editor' },
  { email: 'dev-expert@test.com', password: SEED_PASSWORD, full_name: 'Dev Expert', role: 'domain_expert' },
  { email: 'dev-clinician@test.com', password: SEED_PASSWORD, full_name: 'Dev Clinician', role: 'clinician' },
];

async function main() {
  if (!supabaseDevMode) {
    console.log('Seeding dev users...\n');
  }

  const client = await pool.connect();
  try {
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = $2,
           full_name = $3,
           role = $4`,
        [user.email, passwordHash, user.full_name, user.role]
      );

      if (!supabaseDevMode) {
        console.log(`✓ ${user.email} (${user.role})`);
      }
    }

    const { rows: roleCounts } = await client.query(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role`
    );
    const { rows: totalRows } = await client.query('SELECT COUNT(*)::int AS count FROM users');

    if (supabaseDevMode) {
      console.log(`Dev users upserted: ${users.length}`);
      console.log(`users total: ${totalRows[0].count}`);
      console.log(`users by role: ${roleCounts.map((r) => `${r.role}=${r.count}`).join(', ')}`);
    } else {
      console.log('\nDev users seeded successfully (password not printed).');
      users.forEach((u) => {
        console.log(`  ${u.email} (${u.role})`);
      });
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
