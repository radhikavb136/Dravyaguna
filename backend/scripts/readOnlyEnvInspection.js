/**
 * Read-only aggregates per docs/ENVIRONMENTS.md (no secrets printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(backendRoot, '.env');
const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const databaseUrl = parsed.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL missing in backend/.env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
try {
  const users = await pool.query(
    'SELECT role, COUNT(*)::int AS users FROM users GROUP BY role ORDER BY role'
  );
  const herbs = await pool.query(
    'SELECT status, COUNT(*)::int AS herbs FROM herbs GROUP BY status ORDER BY status'
  );
  const vocab = await pool.query(`
    SELECT 'rasa_terms' AS tbl, COUNT(*)::int AS count FROM rasa_terms
    UNION ALL SELECT 'guna_terms', COUNT(*)::int FROM guna_terms
    UNION ALL SELECT 'karma_terms', COUNT(*)::int FROM karma_terms
    UNION ALL SELECT 'indication_terms', COUNT(*)::int FROM indication_terms
    UNION ALL SELECT 'virya_terms', COUNT(*)::int FROM virya_terms
    UNION ALL SELECT 'vipaka_terms', COUNT(*)::int FROM vipaka_terms
    UNION ALL SELECT 'dhatu_terms', COUNT(*)::int FROM dhatu_terms
    UNION ALL SELECT 'mala_terms', COUNT(*)::int FROM mala_terms
    UNION ALL SELECT 'srotas_terms', COUNT(*)::int FROM srotas_terms
    ORDER BY tbl
  `);
  const audit = await pool.query('SELECT COUNT(*)::int AS audit_rows FROM audit_log');
  const mala = await pool.query('SELECT COUNT(*)::int AS mala_rows FROM herb_mala');
  const rls = await pool.query(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const rlsDisabled = rls.rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);

  console.log(JSON.stringify({
    users_by_role: users.rows,
    herbs_by_status: herbs.rows,
    vocabulary_counts: vocab.rows,
    audit_rows: audit.rows[0].audit_rows,
    mala_rows: mala.rows[0].mala_rows,
    rls_all_enabled: rlsDisabled.length === 0,
    rls_disabled_tables: rlsDisabled,
  }, null, 2));
} catch (error) {
  console.error('READ_ONLY_INSPECTION_FAILED');
  console.error(error.message);
  process.exit(1);
} finally {
  await pool.end();
}
