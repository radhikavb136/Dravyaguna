import { randomUUID } from 'node:crypto';
import { isStorageConfigured, storageEnvValues } from './storageConfig.js';
import { extensionForImageType } from './imageValidation.js';

// Re-export config helpers for routes
export { isStorageConfigured, missingStorageEnvVars } from './storageConfig.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidHerbId(herbId) {
  return typeof herbId === 'string' && UUID_RE.test(herbId);
}

export function buildHerbImageObjectPath(herbId, contentType) {
  const extension = extensionForImageType(contentType);
  if (!extension) throw Object.assign(new Error('Unsupported image type'), { statusCode: 415 });
  const safeHerb = herbId.toLowerCase();
  const fileName = `${randomUUID()}.${extension}`;
  return `${safeHerb}/${fileName}`;
}

/**
 * Upload bytes to Supabase Storage. Does not log keys or response bodies.
 */
export async function uploadHerbImageToSupabase({ herbId, buffer, contentType, fetchImpl = fetch }) {
  if (!isStorageConfigured()) {
    throw Object.assign(new Error('Supabase Storage is not configured'), { statusCode: 503 });
  }
  if (!isValidHerbId(herbId)) {
    throw Object.assign(new Error('Invalid herb id'), { statusCode: 400 });
  }

  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  const bucketPath = buildHerbImageObjectPath(herbId, contentType);
  const encodedPath = bucketPath.split('/').map(encodeURIComponent).join('/');
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const bucket = supabaseStorageBucket;

  const response = await fetchImpl(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
      body: buffer,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const err = Object.assign(new Error('Image storage rejected the upload'), { statusCode: 502 });
    err.storageHttpStatus = response.status;
    throw err;
  }

  const imageUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  return { imageUrl, bucketPath };
}

export function buildProfilePhotoObjectPath(userId, contentType) {
  const extension = extensionForImageType(contentType);
  if (!extension) throw Object.assign(new Error('Unsupported image type'), { statusCode: 415 });
  const safeUser = String(userId).toLowerCase();
  const fileName = `avatar-${Date.now()}.${extension}`;
  return `profile-photos/${safeUser}/${fileName}`;
}

export async function uploadProfilePhotoToSupabase({ userId, buffer, contentType, fetchImpl = fetch }) {
  if (!isStorageConfigured()) {
    throw Object.assign(new Error('Supabase Storage is not configured'), { statusCode: 503 });
  }

  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  const bucketPath = buildProfilePhotoObjectPath(userId, contentType);
  const encodedPath = bucketPath.split('/').map(encodeURIComponent).join('/');
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const bucket = supabaseStorageBucket;

  const response = await fetchImpl(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const err = Object.assign(new Error('Image storage rejected the profile photo upload'), { statusCode: 502 });
    err.storageHttpStatus = response.status;
    throw err;
  }

  const imageUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  return { imageUrl, bucketPath };
}

export async function deleteStorageObject(bucketPath, { fetchImpl = fetch } = {}) {
  if (!isStorageConfigured() || !bucketPath) return false;
  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const bucket = supabaseStorageBucket;

  const res = await fetchImpl(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [bucketPath] }),
      signal: AbortSignal.timeout(10000),
    }
  ).catch(() => null);

  return res?.ok ?? false;
}
