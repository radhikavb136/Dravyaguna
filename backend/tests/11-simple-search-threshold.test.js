import { assertEqual } from './lib/assert.js';
import { SIMILARITY_THRESHOLD } from '../src/services/scoring/simpleSearchMap.js';

export async function run() {
  assertEqual(SIMILARITY_THRESHOLD, 0.45, 'simple search uses the Phase B trigram threshold');
}
