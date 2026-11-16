import { inflateRawSync } from 'node:zlib';
import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';

const stamp = Date.now();
const code = `zz_demo_${stamp}`;
const indicationPhrase = `zz insomnia demo ${stamp}`;

export async function run() {
  const { tokens } = await getTokens();

  const create = await api('POST', '/api/herbs', {
    token: tokens.editor,
    body: {
      code,
      english_name: `ZZ Demo Herb ${stamp}`,
      botanical_name: 'Demo botanical',
      description: `Supports restful sleep patterns. ${indicationPhrase}`,
      raw_indication: indicationPhrase,
      status: 'draft',
      karma: [{ custom: 'Rasayana' }],
    },
  });
  assertEqual(create.status, 201, 'editor creates test herb');
  const herbId = create.data.id;

  const verify = await api('POST', `/api/herbs/${herbId}/verify`, { token: tokens.expert });
  assertEqual(verify.status, 200, 'expert verifies herb');

  const detail = await api('GET', `/api/herbs/${herbId}`, { token: tokens.clinician });
  assert(detail.ok, 'clinician can view verified herb');
  assert(detail.data.raw_indication?.includes(indicationPhrase), 'detail has indication text');

  const simple = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: indicationPhrase, limit: 30 },
  });
  assert(simple.ok, 'simple search');
  assert(
    (simple.data.results || []).some((r) => r.id === herbId),
    'simple search finds herb by stored indication text'
  );

  const detailed = await api('POST', '/api/search/detailed', {
    token: tokens.clinician,
    body: { filters: { karma: ['Rasayana'] }, limit: 50 },
  });
  assert(detailed.ok, 'detailed search');
  assert(
    (detailed.data.results || []).some((r) => r.id === herbId),
    'detailed search includes herb when karma filter matches'
  );

  const exportCsv = await fetch(`${process.env.API_BASE_URL || 'http://127.0.0.1:4010'}/api/herbs/export?format=csv`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assertEqual(exportCsv.status, 200, 'admin csv export');
  const csv = await exportCsv.text();
  assert(csv.includes(code), 'export contains new herb code');

  const denied = await api('POST', '/api/herbs', {
    token: tokens.clinician,
    body: { code: `zz_denied_${stamp}`, english_name: 'Denied' },
  });
  assertEqual(denied.status, 403, 'clinician cannot create herbs');

  await api('DELETE', `/api/herbs/${herbId}`, { token: tokens.admin });
}
