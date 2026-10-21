import { assert, assertEqual } from './lib/assert.js';
import { buildSearchQuery } from '../src/services/scoring/buildSearchQuery.js';

export async function run() {
  const built = buildSearchQuery(
    { rasaIds: [3], gunaIds: [], karmaIds: [], indicationIds: [], dhatuIds: [], malaIdsWithEffects: [], srotasIds: [], avayavaIds: [], viryaId: null, vipakaId: null, doshaSelections: [], prabhavaTerms: [] },
    { rasa: 50 },
    { statuses: ['reviewed', 'verified'], limit: 10, offset: 0 }
  );
  assert(built.sql.includes('WITH ranked AS MATERIALIZED'), 'ranked candidate set is materialized before detail work');
  assert(built.sql.indexOf('LIMIT $') < built.sql.indexOf('details AS MATERIALIZED'), 'limit is applied before breakdown calculation');
  assert(built.sql.includes('EXISTS (SELECT 1 FROM ranked r WHERE r.id = h.id)'), 'breakdown joins are restricted to ranked ids');
  assert(built.sql.includes("jsonb_build_array(rasa_lat.breakdown)"), 'breakdown response shape remains assembled after ranking');
  assertEqual(built.params.length, 7, 'rank and detail queries bind separate parameter sets');
}
