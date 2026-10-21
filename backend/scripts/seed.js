import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_WEIGHTS = {
  rasa: 20,
  guna: 18,
  virya: 12,
  vipaka: 10,
  prabhava: 8,
  dosha: 15,
  dhatu: 6,
  mala: 3,
  srotas: 8,
  avayava: 6,
  karma: 10,
  indication: 15,
};

async function seedWeights(client) {
  for (const [parameterGroup, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    await client.query(
      `INSERT INTO scoring_weights (parameter_group, weight)
       VALUES ($1, $2)
       ON CONFLICT (parameter_group) DO UPDATE SET weight = EXCLUDED.weight`,
      [parameterGroup, weight]
    );
  }
}

async function upsertUser(client, { email, password, fullName, role }) {
  const hash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role`,
    [email.toLowerCase(), hash, fullName, role]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedWeights(client);

    const loadtestEmail = process.env.LOADTEST_EMAIL || 'loadtest@dravyaguna.local';
    const loadtestPassword = process.env.LOADTEST_PASSWORD || 'loadtest-password-change-me';

    await upsertUser(client, {
      email: loadtestEmail,
      password: loadtestPassword,
      fullName: 'Load Test Clinician',
      role: 'clinician',
    });

    await upsertUser(client, {
      email: 'admin@dravyaguna.local',
      password: process.env.SEED_ADMIN_PASSWORD || 'admin-password-change-me',
      fullName: 'Seed Admin',
      role: 'admin',
    });

    await upsertUser(client, {
      email: 'reviewer@dravyaguna.local',
      password: process.env.SEED_REVIEWER_PASSWORD || 'reviewer-password-change-me',
      fullName: 'Seed Domain Expert',
      role: 'domain_expert',
    });

    await client.query('COMMIT');
    console.log('Seed complete: scoring weights, search synonyms, dev users');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
