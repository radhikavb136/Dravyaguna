import { assert, assertEqual } from './lib/assert.js';
import { getTestPool } from './lib/testPool.js';

export async function run() {
  const pool = getTestPool();
  try {
    const { rows: tableCount } = await pool.query("SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname = 'public'");
    assert(tableCount[0].count > 0, 'public schema contains tables');

    const { rows: disabled } = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = false
    `);
    assertEqual(disabled.length, 0, 'every public table enables RLS');

    const { rows: policies } = await pool.query(`
      SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    `);
    assertEqual(policies.length, 0, 'public tables have no RLS policies');
  } finally {
    // shared test pool; closed by tests/run.js
  }
}
