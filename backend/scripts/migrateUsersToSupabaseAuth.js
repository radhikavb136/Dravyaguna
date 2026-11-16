import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { migrateAllUsersToSupabaseAuth } from '../src/services/auth/supabaseAuthService.js';
import { pool } from '../src/db/pool.js';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(backendRoot, '.env') });

async function main() {
  console.log('Starting idempotent user migration to Supabase Auth...');
  const result = await migrateAllUsersToSupabaseAuth();
  console.log('Migration results:');
  console.log(JSON.stringify(result, null, 2));

  const { rows } = await pool.query('SELECT count(*)::int AS count FROM auth.users');
  console.log(`Current auth.users count: ${rows[0].count}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  pool.end();
  process.exit(1);
});
