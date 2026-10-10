/**
 * Dev-only seed script: creates one user per role
 * 
 * Emails:
 * - dev-admin@test.com (admin)
 * - dev-editor@test.com (editor)
 * - dev-expert@test.com (domain_expert)
 * - dev-clinician@test.com (clinician)
 * 
 * Password for all: Dev123456
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { email: 'dev-admin@test.com', password: 'Dev123456', full_name: 'Dev Admin', role: 'admin' },
  { email: 'dev-editor@test.com', password: 'Dev123456', full_name: 'Dev Editor', role: 'editor' },
  { email: 'dev-expert@test.com', password: 'Dev123456', full_name: 'Dev Expert', role: 'domain_expert' },
  { email: 'dev-clinician@test.com', password: 'Dev123456', full_name: 'Dev Clinician', role: 'clinician' },
];

async function main() {
  console.log('Seeding dev users...\n');

  const client = await pool.connect();
  try {
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = $2,
           full_name = $3,
           role = $4
         RETURNING email, role`,
        [user.email, passwordHash, user.full_name, user.role]
      );

      console.log(`✓ ${rows[0].email} (${rows[0].role})`);
    }

    console.log('\nDev users seeded successfully!');
    console.log('\nLogin credentials:');
    users.forEach(u => {
      console.log(`  ${u.email} / ${u.password} (${u.role})`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
