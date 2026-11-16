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
      SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
    `);

    // Verify core sensitive tables have no open public policies (access restricted to backend/service-role)
    const sensitiveTables = ['users', 'herbs', 'audit_log', 'user_roles'];
    const sensitivePolicies = policies.filter((p) => sensitiveTables.includes(p.tablename));
    assertEqual(sensitivePolicies.length, 0, 'core sensitive public tables have no open RLS policies');

    // Self-learning model tables configured in migration 022 define 3 specific full-access policies
    const expectedModelPolicies = [
      { tablename: 'model_interactions', policyname: 'model_interactions_all' },
      { tablename: 'model_learned_associations', policyname: 'model_learned_associations_all' },
      { tablename: 'model_learning_config', policyname: 'model_learning_config_all' },
    ];

    assertEqual(policies.length, expectedModelPolicies.length, `expected ${expectedModelPolicies.length} RLS policies for self-learning model`);
    for (const expected of expectedModelPolicies) {
      assert(
        policies.some((p) => p.tablename === expected.tablename && p.policyname === expected.policyname),
        `policy ${expected.policyname} exists on ${expected.tablename}`
      );
    }
  } finally {
    // shared test pool; closed by tests/run.js
  }
}
