import pg from 'pg';

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';

const pool = new pg.Pool({ connectionString: url });

try {
  const db = await pool.query('SELECT current_database() AS db, inet_server_port() AS port');
  console.log('database', db.rows[0]);

  const migrations = await pool.query(
    `SELECT name FROM pgmigrations ORDER BY run_on DESC LIMIT 10`
  );
  console.log('recent migrations', migrations.rows.map((r) => r.name));

  const has020 = migrations.rows.some((r) => r.name === '020_user_notifications');
  console.log('020_user_notifications recorded', has020);

  const table = await pool.query(
    `SELECT to_regclass('public.user_notifications') AS reg`
  );
  console.log('user_notifications table', table.rows[0].reg);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
