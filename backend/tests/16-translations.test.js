import pg from 'pg';
import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { translateHerbFields } from '../src/services/translations/translationService.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

export async function run() {
  const { tokens } = await getTokens();
  const stamp = Date.now();
  let herbId;
  try {
    const created = await api('POST', '/api/herbs', {
      token: tokens.editor,
      body: { code: `zz_test_translate_${stamp}`, english_name: `ZZ Test Translate ${stamp}`, description: 'Test description.', prabhava: 'Test special property.', part_used: 'Test root.' },
    });
    assertEqual(created.status, 201, 'editor can create translation test herb');
    herbId = created.data.id;
    const calls = [];
    const provider = {
      name: 'test-mock',
      async translate(text, source, target) { calls.push({ text, source, target }); return `Translated ${text}`; },
    };
    const herb = { ...created.data, original_language: 'en-IN' };
    const first = await translateHerbFields(herb, 'hi-IN', provider);
    assertEqual(calls.length, 3, 'first request calls the provider for supported translatable fields');
    assertEqual(first.description.status, 'machine_translated', 'new translation is labelled machine translated');
    const second = await translateHerbFields(herb, 'hi-IN', provider);
    assertEqual(calls.length, 3, 'second request makes zero provider calls on cache hit');
    assertEqual(second.part_used.text, 'Translated Test root.', 'cached field returned');

    const got = await api('GET', `/api/herbs/${herbId}?lang=mr-IN`, { token: tokens.editor });
    assertEqual(got.status, 200, 'herb API accepts target language');
    assert(got.data.translations.prabhava?.text, 'API includes machine-translated fields');

    const denied = await api('POST', '/api/translations/verify', {
      token: tokens.clinician,
      body: { content_type: 'herb', content_id: herbId, field_name: 'description', language: 'hi-IN' },
    });
    assertEqual(denied.status, 403, 'clinician cannot verify a translation');
    const verified = await api('POST', '/api/translations/verify', {
      token: tokens.expert,
      body: { content_type: 'herb', content_id: herbId, field_name: 'description', language: 'hi-IN' },
    });
    assertEqual(verified.status, 200, 'domain expert can verify a cached translation');
    assertEqual(verified.data.status, 'verified_translation', 'verification is persisted');

    const changed = await api('PUT', `/api/herbs/${herbId}`, { token: tokens.editor, body: { description: 'Edited test description.' } });
    assertEqual(changed.status, 200, 'herb edit succeeds');
    const remaining = await pool.query("SELECT COUNT(*)::int AS count FROM translation_cache WHERE content_type='herb' AND content_id=$1", [herbId]);
    assertEqual(remaining.rows[0].count, 0, 'herb edit invalidates translation cache');
  } finally {
    if (herbId) await pool.query("DELETE FROM translation_cache WHERE content_type='herb' AND content_id=$1", [herbId]);
  }
}
