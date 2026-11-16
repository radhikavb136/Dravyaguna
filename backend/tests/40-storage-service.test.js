import { assert, assertEqual } from './lib/assert.js';
import { detectImageType, extensionForImageType, MAX_IMAGE_BYTES } from '../src/services/storage/imageValidation.js';
import {
  isStorageConfigured,
  missingStorageEnvVars,
  storageEnvKeyCatalog,
} from '../src/services/storage/storageConfig.js';
import {
  buildHerbImageObjectPath,
  isValidHerbId,
  uploadHerbImageToSupabase,
} from '../src/services/storage/supabaseStorageService.js';

const SAMPLE_UUID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const STORAGE_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'];

function snapshotStorageEnv() {
  const saved = {};
  for (const key of STORAGE_ENV_KEYS) {
    saved[key] = process.env[key];
  }
  return saved;
}

function clearStorageEnv() {
  for (const key of STORAGE_ENV_KEYS) {
    process.env[key] = '';
  }
}

function restoreStorageEnv(saved) {
  for (const key of STORAGE_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

export async function run() {
  const savedEnv = snapshotStorageEnv();
  assertEqual(detectImageType(PNG_BYTES), 'image/png', 'detects PNG magic bytes');
  assertEqual(detectImageType(Buffer.from('text')), null, 'rejects non-image bytes');
  assertEqual(extensionForImageType('image/png'), 'png', 'maps png extension');
  assert(MAX_IMAGE_BYTES === 2 * 1024 * 1024, '2mb cap');

  assertEqual(isValidHerbId(SAMPLE_UUID), true, 'accepts uuid herb id');
  assertEqual(isValidHerbId('../../../etc/passwd'), false, 'rejects path-like id');
  assertEqual(isValidHerbId('not-uuid'), false, 'rejects non-uuid');

  const path = buildHerbImageObjectPath(SAMPLE_UUID, 'image/png');
  assert(path.startsWith(`${SAMPLE_UUID.toLowerCase()}/`), 'path is scoped to herb id');
  assert(!path.includes('..'), 'path has no traversal');
  assert(path.endsWith('.png'), 'path uses safe extension');

  clearStorageEnv();
  try {
    assertEqual(isStorageConfigured(), false, 'storage unset in test runner env');
    const missing = missingStorageEnvVars();
    assert(missing.includes('SUPABASE_URL'), 'reports missing supabase url');
    assert(missing.includes('SUPABASE_SERVICE_ROLE_KEY'), 'reports missing service role');
    assert(missing.includes('SUPABASE_STORAGE_BUCKET'), 'reports missing bucket');
    assertEqual(storageEnvKeyCatalog().length, 3, 'catalog lists three keys');

    let fetchCalled = false;
    await uploadHerbImageToSupabase({
      herbId: SAMPLE_UUID,
      buffer: PNG_BYTES,
      contentType: 'image/png',
      fetchImpl: async () => {
        fetchCalled = true;
        return { ok: true };
      },
    }).catch(() => {});
    assertEqual(fetchCalled, false, 'does not call storage when env is not configured');
  } finally {
    restoreStorageEnv(savedEnv);
  }

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.SUPABASE_STORAGE_BUCKET = 'herb-images';

  try {
    let capturedUrl = '';
    const result = await uploadHerbImageToSupabase({
      herbId: SAMPLE_UUID,
      buffer: PNG_BYTES,
      contentType: 'image/png',
      fetchImpl: async (url, init) => {
        capturedUrl = url;
        assert(init.headers['x-upsert'] === 'false', 'does not upsert by default');
        assertEqual(init.headers['Content-Type'], 'image/png', 'sends detected content type');
        return { ok: true };
      },
    });
    assert(capturedUrl.includes('/storage/v1/object/'), 'uses supabase storage API path');
    assert(result.imageUrl.includes('/object/public/'), 'returns public object URL shape');
    assert(!result.imageUrl.includes('test-service-role-key'), 'URL does not embed service key');
  } finally {
    restoreStorageEnv(savedEnv);
  }
}
