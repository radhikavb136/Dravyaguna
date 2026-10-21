/**
 * Reset scoring_weights to the defaults in ScoringConfiguration.jsx
 * (plus avayava, which is disabled in the UI).
 */
import dotenv from 'dotenv';
import pg from 'pg';
import { DEFAULT_SCORING_WEIGHTS } from '../src/config/defaultWeights.js';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset weights when NODE_ENV=production');
  }
  const prodRef = process.env.PROD_DB_REF || '';
  if (prodRef && (process.env.DATABASE_URL || '').includes(prodRef)) {
    throw new Error('Refusing to reset weights against the production database');
  }

  const client = await pool.connect();
  try {
    for (const [parameterGroup, weight] of Object.entries(DEFAULT_SCORING_WEIGHTS)) {
      await client.query(
        `UPDATE scoring_weights SET weight = $1, updated_at = now() WHERE parameter_group = $2`,
        [weight, parameterGroup]
      );
    }
    const { rows } = await client.query(
      `SELECT parameter_group, weight::float AS weight FROM scoring_weights ORDER BY parameter_group`
    );
    console.log('Scoring weights reset:');
    for (const row of rows) {
      console.log(`  ${row.parameter_group}: ${row.weight}`);
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
