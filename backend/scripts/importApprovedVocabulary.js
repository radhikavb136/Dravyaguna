/**
 * Apply domain-approved vocabulary rows from scripts/vocab_review.csv.
 * Only rows with a non-empty approved_canonical column are applied.
 * Inserts missing karma/indication terms and optional term_synonyms for raw_token.
 *
 * Default: dry-run (no writes). Pass --apply to mutate the database.
 * Remote targets require ALLOW_REMOTE_DATA_IMPORT=YES (same guard as dataset import).
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { assertDatasetImportTarget } from '../src/utils/datasetImportSafety.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = process.env.VOCAB_REVIEW_CSV
  ? path.resolve(process.env.VOCAB_REVIEW_CSV)
  : path.join(__dirname, 'vocab_review.csv');

const apply = process.argv.includes('--apply');

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function loadApprovedRows() {
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const idx = {
    category: header.indexOf('category'),
    raw: header.indexOf('raw_token'),
    approved: header.indexOf('approved_canonical'),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const approved = (cells[idx.approved] || '').trim();
    if (!approved) continue;
    rows.push({
      category: (cells[idx.category] || '').trim().toLowerCase(),
      rawToken: (cells[idx.raw] || '').trim(),
      approvedCanonical: approved,
    });
  }
  return rows;
}

async function findTermId(client, category, canonical) {
  const table = category === 'indication' ? 'indication_terms' : category === 'karma' ? 'karma_terms' : null;
  if (!table) return null;
  const slug = canonical.toLowerCase().replace(/\s+/g, '-');
  const { rows } = await client.query(
    `SELECT id FROM ${table} WHERE lower(canonical_en) = lower($1) OR slug = $2 LIMIT 1`,
    [canonical, slug]
  );
  return rows[0]?.id || null;
}

async function ensureTerm(client, category, canonical) {
  const existing = await findTermId(client, category, canonical);
  if (existing) return { id: existing, created: false };
  const table = category === 'indication' ? 'indication_terms' : 'karma_terms';
  const slug = canonical.toLowerCase().replace(/\s+/g, '-');
  const { rows } = await client.query(
    `INSERT INTO ${table} (canonical_en, slug, is_custom) VALUES ($1, $2, true) RETURNING id`,
    [canonical, slug]
  );
  return { id: rows[0].id, created: true };
}

async function ensureSynonym(client, category, termId, rawToken) {
  if (!rawToken) return false;
  const vocabulary = category === 'indication' ? 'indication' : 'karma';
  const { rows } = await client.query(
    `SELECT id FROM term_synonyms
     WHERE vocabulary = $1 AND term_id = $2 AND lower(text) = lower($3) LIMIT 1`,
    [vocabulary, termId, rawToken]
  );
  if (rows[0]) return false;
  await client.query(
    `INSERT INTO term_synonyms (vocabulary, term_id, language_code, text, approval_status)
     VALUES ($1, $2, 'en', $3, 'approved')`,
    [vocabulary, termId, rawToken]
  );
  return true;
}

async function main() {
  const rows = loadApprovedRows();
  const summary = {
    csv: CSV_PATH,
    mode: apply ? 'apply' : 'dry-run',
    approved_rows: rows.length,
    terms_created: 0,
    synonyms_created: 0,
    skipped_unsupported_category: 0,
  };

  if (rows.length === 0) {
    console.log(JSON.stringify({
      ...summary,
      note: 'No rows with approved_canonical set. Fill approved_canonical in vocab_review.csv before --apply.',
    }, null, 2));
    return;
  }

  if (!apply) {
    console.log(JSON.stringify({ ...summary, sample: rows.slice(0, 5) }, null, 2));
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  assertDatasetImportTarget({
    databaseUrl,
    nodeEnv: process.env.NODE_ENV,
    allowRemoteImport: process.env.ALLOW_REMOTE_DATA_IMPORT,
  });

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      if (row.category !== 'karma' && row.category !== 'indication') {
        summary.skipped_unsupported_category += 1;
        continue;
      }
      const term = await ensureTerm(client, row.category, row.approvedCanonical);
      if (term.created) summary.terms_created += 1;
      const syn = await ensureSynonym(client, row.category, term.id, row.rawToken);
      if (syn) summary.synonyms_created += 1;
    }
    await client.query('COMMIT');
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
