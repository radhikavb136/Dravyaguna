import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const stamp = Date.now();
  const name = `zz_test_karma_${stamp}`;

  const clinician = await api('POST', '/api/vocabulary/karma', {
    token: tokens.clinician,
    body: { canonical_en: name },
  });
  assertEqual(clinician.status, 403, 'clinician cannot create karma');

  const created = await api('POST', '/api/vocabulary/karma', {
    token: tokens.editor,
    body: { canonical_en: name },
  });
  assert(created.ok, 'editor can create custom karma');

  const filters = await api('GET', '/api/vocabulary/filters', { token: tokens.editor });
  const match = filters.data.karma.find((term) => term.label === name);
  assert(match, 'custom karma appears in filters');
  assert(match.slug, 'custom karma has slug');

  const clinicianUpdate = await api('PATCH', `/api/vocabulary/karma/${created.data.id}`, {
    token: tokens.clinician,
    body: { canonical_en: `${name}_blocked` },
  });
  assertEqual(clinicianUpdate.status, 403, 'clinician cannot edit karma');

  const updated = await api('PATCH', `/api/vocabulary/karma/${created.data.id}`, {
    token: tokens.admin,
    body: { canonical_en: `${name}_updated` },
  });
  assert(updated.ok, 'admin can edit custom karma');
  assertEqual(updated.data.canonical_en, `${name}_updated`, 'updated karma name');

  const mergeSource = await api('POST', '/api/vocabulary/karma', {
    token: tokens.editor,
    body: { canonical_en: `${name}_source` },
  });
  assert(mergeSource.ok, 'editor creates source term for relink test');

  const herb = await api('POST', '/api/herbs', {
    token: tokens.editor,
    body: {
      code: `zz_test_vocab_herb_${stamp}`,
      english_name: 'ZZ Test Vocabulary Relink Herb',
      sanskrit_name: 'zz_test',
      description: 'Test herb used to validate vocabulary relinking',
      rasa: ['tikta'],
      guna: ['laghu'],
      karma: [{ custom: `${name}_source` }],
      virya: 'ushna',
      vipaka: 'madhura',
      dosha_actions: [{ dosha: 'vata', effect: 'pacifies' }],
      dhatu: [{ term: 'rasa', score: 3 }],
      mala: [{ term: 'purisha', effect: 'decreases' }],
      srotas: ['rasavaha'],
    },
  });
  assertEqual(herb.status, 201, `editor creates herb linked to source vocabulary term (${JSON.stringify(herb.data)})`);

  const protectedDelete = await api('DELETE', `/api/vocabulary/karma/${mergeSource.data.id}`, {
    token: tokens.admin,
  });
  assertEqual(protectedDelete.status, 409, 'cannot delete vocabulary term while herb uses it');

  const editorMerge = await api('POST', `/api/vocabulary/karma/${mergeSource.data.id}/merge`, {
    token: tokens.editor,
    body: { target_id: created.data.id },
  });
  assertEqual(editorMerge.status, 403, 'editor cannot merge vocabulary terms');

  const merge = await api('POST', `/api/vocabulary/karma/${mergeSource.data.id}/merge`, {
    token: tokens.admin,
    body: { target_id: created.data.id },
  });
  assert(merge.ok, 'admin can merge karma');

  const relinkedHerb = await api('GET', `/api/herbs/${herb.data.id}`, { token: tokens.editor });
  assert(relinkedHerb.ok, 'load herb after vocabulary merge');
  assert(relinkedHerb.data.karma.includes(`${name}_updated`), 'merge relinks herb to target term');
  assert(!relinkedHerb.data.karma.includes(`${name}_source`), 'merge removes source term from herb');

  const deleted = await api('DELETE', `/api/vocabulary/karma/${created.data.id}`, {
    token: tokens.admin,
  });
  assertEqual(deleted.status, 409, 'cannot delete target vocabulary term while herb uses it');

  const unlinkHerb = await api('PUT', `/api/herbs/${herb.data.id}`, {
    token: tokens.editor,
    body: { karma: [] },
  });
  assertEqual(unlinkHerb.status, 200, 'editor removes test herb vocabulary reference');

  const archivedHerb = await api('DELETE', `/api/herbs/${herb.data.id}`, { token: tokens.admin });
  assertEqual(archivedHerb.status, 200, 'admin archives herb after merge test');

  const deleteAfterArchive = await api('DELETE', `/api/vocabulary/karma/${created.data.id}`, {
    token: tokens.admin,
  });
  assertEqual(deleteAfterArchive.status, 204, 'admin deletes term after its herb is archived');

  const indication = await api('POST', '/api/vocabulary/indications', {
    token: tokens.editor,
    body: { canonical_en: `zz_test_ind_${Date.now()}` },
  });
  assert(indication.ok, 'editor can create custom indication');
}
