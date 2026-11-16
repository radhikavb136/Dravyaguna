import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pgRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'backend',
  'node_modules',
  'pg'
);
const { Pool } = require(pgRoot);

function assertLocalUrl(url) {
  const lower = String(url || '').toLowerCase();
  if (!lower.includes('127.0.0.1') && !lower.includes('localhost')) {
    throw new Error('E2E DB helper refuses non-local DATABASE_URL');
  }
  if (lower.includes('supabase') || lower.includes('pooler')) {
    throw new Error('E2E DB helper refuses remote pooler URL');
  }
}

export async function withE2ePool(fn) {
  const databaseUrl =
    process.env.E2E_DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';
  assertLocalUrl(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

/** Insert a draft synonym mapping for UI review tests; returns id. */
export async function insertDraftSynonymMapping(text) {
  return withE2ePool(async (pool) => {
    const karma = await pool.query(
      `SELECT id FROM karma_terms WHERE lower(canonical_en) = 'deepana' LIMIT 1`
    );
    if (!karma.rows[0]) {
      throw new Error('Deepana karma term missing in E2E database');
    }
    const inserted = await pool.query(
      `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
       VALUES ('karma', $1, 'en-IN', $2, 'draft') RETURNING id`,
      [karma.rows[0].id, text]
    );
    return inserted.rows[0].id;
  });
}

export async function deleteSynonymMapping(id) {
  return withE2ePool(async (pool) => {
    await pool.query('DELETE FROM term_synonyms WHERE id = $1', [id]);
  });
}

export async function deleteSupportRequestsLike(prefix) {
  return withE2ePool(async (pool) => {
    await pool.query('DELETE FROM support_requests WHERE message LIKE $1', [`${prefix}%`]);
  });
}
