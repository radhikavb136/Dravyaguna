import { assertEqual } from './lib/assert.js';
import { api, BASE_URL } from './lib/http.js';
import { getTokens } from './lib/session.js';

async function postImage(id, token, bytes, contentType = 'image/png') {
  return fetch(`${BASE_URL}/api/upload/herb-image/${id}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType }, body: bytes,
  });
}

export async function run() {
  const { tokens } = await getTokens();
  const stamp = Date.now();
  const created = await api('POST', '/api/herbs', {
    token: tokens.editor,
    body: { code: `zz_test_upload_${stamp}`, english_name: `ZZ Test Upload ${stamp}` },
  });
  assertEqual(created.status, 201, 'editor creates a temporary herb for upload tests');
  const herbId = created.data.id;
  const invalidMagic = await postImage(herbId, tokens.editor, Buffer.from('not a png'), 'image/png');
  assertEqual(invalidMagic.status, 415, 'rejects content whose magic bytes do not match declared type');

  const tooLarge = Buffer.alloc(2 * 1024 * 1024 + 1);
  tooLarge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const largeResponse = await postImage(herbId, tokens.editor, tooLarge);
  assertEqual(largeResponse.status, 413, 'rejects an image over the 2 MB request limit');

  const clinician = await postImage(herbId, tokens.clinician, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  assertEqual(clinician.status, 403, 'clinician cannot upload images');

  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const unavailable = await postImage(herbId, tokens.editor, validPng);
  assertEqual(unavailable.status, 503, 'test environment refuses external Supabase Storage writes');
}
