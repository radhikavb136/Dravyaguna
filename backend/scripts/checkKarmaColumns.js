import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const columns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'karma_terms'
    `);
    console.log('karma_terms columns:', columns.rows.map(r => r.column_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
