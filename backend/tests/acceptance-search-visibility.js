/**
 * CLI entry for Phase 1 acceptance (same logic as 29-acceptance-search-visibility.test.js).
 * Usage: node tests/acceptance-search-visibility.js
 * Optional: ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55 for approved dev dataset baseline.
 */
import dotenv from 'dotenv';
import { assertTestDatabaseAllowed } from './lib/safety.js';
import { run } from './29-acceptance-search-visibility.test.js';

dotenv.config();
assertTestDatabaseAllowed();

try {
  await run();
  console.log('PASS  acceptance-search-visibility (baseline-relative  N → N → N+1 → N+1 → N)');
} catch (error) {
  console.error('FAIL  acceptance-search-visibility');
  console.error(`  ${error.message}`);
  process.exitCode = 1;
}
