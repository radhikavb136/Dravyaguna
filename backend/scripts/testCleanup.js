/**
 * List or remove leftover test records.
 * Default is dry-run. Pass --apply to delete (never the four dev users, never real herbs).
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const DEV_EMAILS = [
  'dev-admin@test.com',
  'dev-editor@test.com',
  'dev-expert@test.com',
  'dev-clinician@test.com',
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing cleanup when NODE_ENV=production');
  }
  const prodRef = process.env.PROD_DB_REF || '';
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  const usernameMatch = decodeURIComponent(databaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
  const databaseProjectRef = usernameMatch ? usernameMatch[1] : '';
  const devRef = process.env.DEV_DB_REF || '';
  if (prodRef && ((process.env.DATABASE_URL || '').includes(prodRef) || databaseProjectRef === prodRef)) {
    throw new Error('Refusing cleanup against the production database');
  }
  if (APPLY && (!devRef || databaseProjectRef !== devRef)) {
    throw new Error('DEV_DB_REF must exactly match the Supabase project ref for cleanup apply');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();
  try {
    const users = await client.query(
      `SELECT email, role, status
       FROM users
       WHERE (
         email LIKE 'zz_test_%'
         OR email IN ('clinician@test.com', 'editor@test.com', 'expert@test.com', 'admin@test.com')
         OR email LIKE '%@test.com'
       )
       AND email <> ALL($1::text[])
       ORDER BY email`,
      [DEV_EMAILS]
    );

    const herbs = await client.query(
      `SELECT code, english_name, status
       FROM herbs
       WHERE code LIKE 'zz_test_%'
          OR code LIKE 'TEST_HERB_%'
         OR code LIKE 'ACCEPTANCE_TEST_%'
         OR code LIKE 'PHASE1_TEST_%'
         OR code LIKE 'UI_TEST_%'
          OR english_name ILIKE 'ZZ Test%'
          OR english_name = 'Test Herb'
       ORDER BY code`
    );

    const karma = await client.query(
      `SELECT slug, canonical_en FROM karma_terms WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'`
    );
    const indications = await client.query(
      `SELECT slug, canonical_en FROM indication_terms WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'`
    );

    console.log(APPLY ? 'APPLY mode' : 'DRY RUN (no deletions)');
    console.log('\nUsers:');
    if (users.rows.length === 0) console.log('  (none)');
    users.rows.forEach((row) => console.log(`  ${row.email}  ${row.role}  ${row.status}`));

    console.log('\nHerbs:');
    if (herbs.rows.length === 0) console.log('  (none)');
    herbs.rows.forEach((row) => console.log(`  ${row.code}  ${row.status}  ${row.english_name}`));

    console.log('\nCustom karma terms:');
    if (karma.rows.length === 0) console.log('  (none)');
    karma.rows.forEach((row) => console.log(`  ${row.slug}  ${row.canonical_en}`));

    console.log('\nCustom indication terms:');
    if (indications.rows.length === 0) console.log('  (none)');
    indications.rows.forEach((row) => console.log(`  ${row.slug}  ${row.canonical_en}`));

    if (!APPLY) {
      console.log('\nNo rows deleted. Re-run with --apply after approval.');
      return;
    }

    await client.query('BEGIN');
    await client.query(
      `DELETE FROM herbs
       WHERE code LIKE 'zz_test_%'
          OR code LIKE 'TEST_HERB_%'
         OR code LIKE 'ACCEPTANCE_TEST_%'
         OR code LIKE 'PHASE1_TEST_%'
         OR code LIKE 'UI_TEST_%'
          OR english_name ILIKE 'ZZ Test%'`
    );
    await client.query(
      `DELETE FROM karma_terms WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'`
    );
    await client.query(
      `DELETE FROM indication_terms WHERE slug LIKE 'zz_test_%' OR canonical_en LIKE 'zz_test_%'`
    );
    await client.query(
      `DELETE FROM users
       WHERE (
         email LIKE 'zz_test_%'
         OR email IN ('clinician@test.com', 'editor@test.com', 'expert@test.com', 'admin@test.com')
       )
       AND email <> ALL($1::text[])`,
      [DEV_EMAILS]
    );
    await client.query('COMMIT');
    console.log('\nApply finished.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
