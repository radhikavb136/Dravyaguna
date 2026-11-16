import { env } from '../../config/env.js';

const STORAGE_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'];

export function storageEnvValues() {
  return {
    supabaseUrl: (process.env.SUPABASE_URL ?? env.supabaseUrl ?? '').trim(),
    supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.supabaseServiceRoleKey ?? '').trim(),
    supabaseStorageBucket: (process.env.SUPABASE_STORAGE_BUCKET ?? env.supabaseStorageBucket ?? '').trim(),
  };
}

export function isStorageConfigured() {
  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  return Boolean(supabaseUrl && supabaseServiceRoleKey && supabaseStorageBucket);
}

/** Names of unset storage env vars (no secret values). */
export function missingStorageEnvVars() {
  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseStorageBucket) missing.push('SUPABASE_STORAGE_BUCKET');
  return missing;
}

export function storageEnvKeyCatalog() {
  return [...STORAGE_ENV_KEYS];
}
