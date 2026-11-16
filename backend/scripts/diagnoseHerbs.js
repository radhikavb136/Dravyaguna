import { pool } from '../src/db/pool.js';

async function main() {
  try {
    const { rows } = await pool.query("SELECT name, run_on FROM pgmigrations ORDER BY id DESC LIMIT 10");
    console.log('Latest applied migrations:', rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
