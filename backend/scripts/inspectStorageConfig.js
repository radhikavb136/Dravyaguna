/**
 * Prints storage configuration status (env var names only, no secrets).
 */
import dotenv from 'dotenv';
import {
  isStorageConfigured,
  missingStorageEnvVars,
  storageEnvKeyCatalog,
} from '../src/services/storage/storageConfig.js';

dotenv.config();

const payload = {
  storageConfigured: isStorageConfigured(),
  missing_env: missingStorageEnvVars(),
  expected_env_keys: storageEnvKeyCatalog(),
  notes: [
    'Bucket must allow public read for herb image URLs returned by the API (or use signed URLs in a future change).',
    'Service role key is server-only; never expose to the frontend.',
    'Live upload verification requires all missing_env keys plus NODE_ENV !== test.',
  ],
};

console.log(JSON.stringify(payload, null, 2));
