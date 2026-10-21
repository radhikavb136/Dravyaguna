import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  const { rows: missing } = await pool.query(`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
    ORDER BY tablename
  `);

  if (missing.length) {
    console.error('Public tables with RLS disabled:');
    for (const table of missing) console.error(`- ${table.schemaname}.${table.tablename}`);
    process.exitCode = 1;
  } else {
    console.log('All public tables have row-level security enabled.');
  }
} catch {
  console.error('Unable to inspect public-table RLS state.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
