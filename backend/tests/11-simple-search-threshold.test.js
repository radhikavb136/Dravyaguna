import { assertEqual } from './lib/assert.js';
import { RELATIVE_CUTOFF, SIMILARITY_THRESHOLD } from '../src/services/scoring/simpleSearchMap.js';

export async function run() {
  assertEqual(SIMILARITY_THRESHOLD, 0.45, 'simple search uses the Phase B trigram threshold');
  assertEqual(RELATIVE_CUTOFF, 0.8, 'simple search uses a relative cutoff for fuzzy candidates');
}
