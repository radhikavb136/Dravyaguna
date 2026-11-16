import { assert, assertEqual } from './lib/assert.js';
import {
  normalizeSimpleQuery,
  detectSearchLanguage,
  SIMILARITY_THRESHOLD,
  RELATIVE_CUTOFF,
} from '../src/services/scoring/simpleSearchMap.js';

export async function run() {
  assertEqual(normalizeSimpleQuery('  Deepana '), 'deepana', 'trims and lowercases');
  assertEqual(normalizeSimpleQuery('Deepana!!!'), 'deepana', 'strips punctuation');
  assertEqual(normalizeSimpleQuery('Ｄeepana'), 'deepana', 'NFKC folds fullwidth latin to ASCII');
  assertEqual(normalizeSimpleQuery('fire   worm'), 'fire worm', 'collapses whitespace');

  assertEqual(detectSearchLanguage('deepana'), 'en-IN', 'latin query is English');
  assertEqual(detectSearchLanguage('दीपन'), 'hi-IN', 'devanagari is Hindi');
  assertEqual(detectSearchLanguage(''), 'en-IN', 'empty defaults to English');

  assert(SIMILARITY_THRESHOLD === 0.45, 'similarity threshold matches contract');
  assert(RELATIVE_CUTOFF === 0.8, 'relative cutoff matches contract');
}
