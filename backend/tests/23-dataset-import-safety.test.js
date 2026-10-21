import { assert, assertEqual } from './lib/assert.js';
import { assertDatasetImportTarget } from '../src/utils/datasetImportSafety.js';

export async function run() {
  assertEqual(assertDatasetImportTarget({ databaseUrl: 'postgresql://user:pass@127.0.0.1:5432/dev', nodeEnv: 'development' }), undefined, 'loopback development database is permitted');
  assertEqual(assertDatasetImportTarget({ databaseUrl: 'postgresql://user:pass@localhost:5432/dev', nodeEnv: 'test' }), undefined, 'localhost test database is permitted');
  assertThrows(() => assertDatasetImportTarget({ databaseUrl: 'postgresql://user:pass@db.example.test:5432/prod', nodeEnv: 'development' }), 'remote target requires explicit confirmation');
  assertThrows(() => assertDatasetImportTarget({ databaseUrl: 'postgresql://user:pass@db.example.test:5432/prod', nodeEnv: 'production' }), 'production target requires explicit confirmation');
  assertEqual(assertDatasetImportTarget({ databaseUrl: 'postgresql://user:pass@db.example.test:5432/staging', nodeEnv: 'production', allowRemoteImport: 'YES' }), undefined, 'explicit remote import confirmation permits a deliberate import');
  assertThrows(() => assertDatasetImportTarget({ databaseUrl: '', nodeEnv: 'development' }), 'missing database target is rejected');
  assertThrows(() => assertDatasetImportTarget({ databaseUrl: 'not-a-url', nodeEnv: 'development' }), 'invalid database target is rejected');
}

function assertThrows(action, message) {
  try {
    action();
  } catch {
    return assert(true, message);
  }
  assert(false, message);
}
