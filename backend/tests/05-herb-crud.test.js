import { assert, assertEqual } from './lib/assert.js';
import { api, countFullMatches } from './lib/http.js';
import { getTokens } from './lib/session.js';

function tiktaDeepanaHerb(code) {
  return {
    code,
    english_name: 'ZZ Test Tikta Deepana',
    sanskrit_name: 'zz_test',
    description: 'Test herb description',
    identification_notes: 'Test identification notes',
    references: [{ source: 'QA Text', chapter: 'Chapter 1', verse: 'Verse 2', notes: 'Test citation note' }],
    rasa: ['tikta'],
    karma: ['deepana'],
    guna: ['laghu'],
    virya: 'ushna',
    vipaka: 'madhura',
    dosha_actions: [{ dosha: 'vata', effect: 'pacifies' }],
    dhatu: [{ term: 'rasa', score: 3 }],
    mala: [{ term: 'purisha', effect: 'decreases' }],
    srotas: ['rasavaha'],
  };
}

async function searchClinician(token) {
  const res = await api('POST', '/api/search/detailed', {
    token,
    body: { filters: { rasa: ['tikta'], karma: ['deepana'] }, limit: 200 },
  });
  assert(res.ok, 'clinician search');
  return res.data.results || [];
}

export async function run() {
  const { tokens } = await getTokens();
  const code = `zz_test_${Date.now()}`;
  let herbId = null;

  try {
    const clinicianCreate = await api('POST', '/api/herbs', {
      token: tokens.clinician,
      body: tiktaDeepanaHerb(code),
    });
    assertEqual(clinicianCreate.status, 403, 'clinician cannot create');

    const created = await api('POST', '/api/herbs', {
      token: tokens.editor,
      body: tiktaDeepanaHerb(code),
    });
    assertEqual(created.status, 201, `editor create (${JSON.stringify(created.data)})`);
    assertEqual(created.data.status, 'draft', 'created as draft');
    assertEqual(created.data.description, 'Test herb description', 'description persisted');
    assertEqual(created.data.identification_notes, 'Test identification notes', 'identification notes persisted');
    assertEqual(created.data.references[0]?.source, 'QA Text', 'classical reference source persisted');
    assertEqual(created.data.references[0]?.verse, 'Verse 2', 'classical reference verse persisted');
    herbId = created.data.id;

    const baseline = await searchClinician(tokens.clinician);
    const baselineFullMatches = countFullMatches(baseline);
    assert(baselineFullMatches > 0, 'baseline has full matches');

    const clinicianUpdate = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.clinician,
      body: { english_name: 'nope' },
    });
    assertEqual(clinicianUpdate.status, 403, 'clinician cannot update');

    const editorVerify = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.editor,
      body: { status: 'verified' },
    });
    assertEqual(editorVerify.status, 403, 'editor cannot set verified');

    const editorArchive = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.editor,
      body: { status: 'archived' },
    });
    assertEqual(editorArchive.status, 403, 'editor cannot archive through update');

    const reviewed = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.editor,
      body: { status: 'reviewed' },
    });
    assertEqual(reviewed.status, 200, 'editor sets reviewed');
    assertEqual(reviewed.data.status, 'reviewed', 'status reviewed');

    const clinicianVerify = await api('POST', `/api/herbs/${herbId}/verify`, {
      token: tokens.clinician,
    });
    assertEqual(clinicianVerify.status, 403, 'clinician cannot verify herbs');

    const editorVerifyRoute = await api('POST', `/api/herbs/${herbId}/verify`, {
      token: tokens.editor,
    });
    assertEqual(editorVerifyRoute.status, 403, 'editor cannot verify herbs');

    const afterReview = await searchClinician(tokens.clinician);
    assertEqual(countFullMatches(afterReview), baselineFullMatches + 1, 'reviewed herb visible at 100%');
    assertEqual(afterReview.length, baseline.length + 1, 'clinician total after review');

    const verified = await api('POST', `/api/herbs/${herbId}/verify`, {
      token: tokens.expert,
    });
    assertEqual(verified.status, 200, 'domain expert verify');
    assertEqual(verified.data.status, 'verified', 'verified status');

    const afterVerify = await searchClinician(tokens.clinician);
    assertEqual(countFullMatches(afterVerify), baselineFullMatches + 1, 'verified herb stays visible');

    const editVerified = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.editor,
      body: {
        english_name: 'ZZ Test Tikta Deepana Edited',
        description: 'Updated description',
        identification_notes: 'Updated identification notes',
        references: [{ source: 'QA Text', chapter: 'Chapter 3', verse: 'Verse 4', notes: 'Updated note' }],
      },
    });
    assertEqual(editVerified.data.status, 'reviewed', 'editing verified herb returns reviewed');
    assertEqual(editVerified.data.description, 'Updated description', 'description update persisted');
    assertEqual(editVerified.data.identification_notes, 'Updated identification notes', 'identification notes update persisted');
    assertEqual(editVerified.data.references[0]?.verse, 'Verse 4', 'reference update persisted');

    const adminVerify = await api('POST', `/api/herbs/${herbId}/verify`, {
      token: tokens.admin,
    });
    assertEqual(adminVerify.status, 200, 'admin can verify herbs');
    assertEqual(adminVerify.data.status, 'verified', 'admin verification is persisted');

    const expertArchive = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.expert,
      body: { status: 'archived' },
    });
    assertEqual(expertArchive.status, 403, 'reviewer cannot archive through update');

    const adminArchiveUpdate = await api('PUT', `/api/herbs/${herbId}`, {
      token: tokens.admin,
      body: { status: 'archived' },
    });
    assertEqual(adminArchiveUpdate.status, 200, 'admin can archive through update');
    assertEqual(adminArchiveUpdate.data.status, 'archived', 'admin archive update persisted');

    const archived = await api('DELETE', `/api/herbs/${herbId}`, {
      token: tokens.admin,
    });
    assertEqual(archived.status, 200, 'admin archive');
    assertEqual(archived.data.status, 'archived', 'archived status');
    herbId = null;

    const afterArchive = await searchClinician(tokens.clinician);
    assertEqual(countFullMatches(afterArchive), baselineFullMatches, 'archive restores baseline matches');
    assertEqual(afterArchive.length, baseline.length, 'archive restores clinician total');
  } finally {
    if (herbId) {
      await api('DELETE', `/api/herbs/${herbId}`, { token: tokens.admin });
    }
  }
}
