import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

const pool = getTestPool();

export async function run() {
  const { tokens } = await getTokens();
  const { rows } = await pool.query(
    `SELECT english_name FROM herbs WHERE status IN ('reviewed', 'verified') AND english_name IS NOT NULL LIMIT 1`
  );
  assert(rows[0]?.english_name, 'fixture requires at least one reviewed herb english_name');

  const target = rows[0].english_name.trim();
  const unknown = `zz_noname_${Date.now()}`;

  const byName = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: target, limit: 10 },
  });
  assertEqual(byName.status, 200, 'herb name search status');
  assert(byName.data.meta?.name_search === true, 'name_search meta flag');
  assert(
    byName.data.results.some((row) => row.englishName?.toLowerCase() === target.toLowerCase()),
    `results include ${target}`
  );

  const empty = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: unknown, limit: 5 },
  });
  assertEqual(empty.status, 200, 'unknown name search status');
  assertEqual(empty.data.results.length, 0, 'unknown name returns no herbs');
}
