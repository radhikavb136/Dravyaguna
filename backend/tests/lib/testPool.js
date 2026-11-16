import pg from 'pg';

let pool;

/** One shared pool for integration tests to avoid exhausting Supabase session pool_size. */
export function getTestPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function endTestPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
