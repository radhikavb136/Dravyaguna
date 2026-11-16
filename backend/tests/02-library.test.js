import dotenv from 'dotenv';
import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

dotenv.config();

async function findByCode(token, code) {
  let page = 1;
  for (;;) {
    const res = await api('GET', `/api/herbs?page=${page}&limit=100`, { token });
    assert(res.ok, `list herbs failed (${res.status})`);
    const hit = (res.data.data || []).find((row) => row.code === code);
    if (hit) {
      return { hit, pagination: res.data.pagination };
    }
    const total = res.data.pagination?.total ?? 0;
    const pageSize = res.data.pagination?.pageSize ?? res.data.pagination?.limit ?? 100;
    if (page * pageSize >= total) {
      return { hit: null, pagination: res.data.pagination };
    }
    page += 1;
  }
}

export async function run() {
  const { tokens } = await getTokens();

  const clinicianList = await api('GET', '/api/herbs?page=1&limit=100', {
    token: tokens.clinician,
  });
  assert(clinicianList.ok, 'clinician list');
  const clinicianTotal = clinicianList.data.pagination.total;
  assert(clinicianTotal > 0, 'clinician has visible herbs');
  assertEqual(clinicianList.data.pagination.page, 1, 'page');
  assert(
    clinicianList.data.pagination.pageSize === 100 || clinicianList.data.pagination.limit === 100,
    'pageSize/limit'
  );
  assert(
    clinicianList.data.data.length <= clinicianList.data.pagination.pageSize,
    'page length respects pageSize'
  );

  const editorList = await api('GET', '/api/herbs?page=1&limit=100', {
    token: tokens.editor,
  });
  assert(editorList.data.pagination.total >= clinicianTotal, 'editors see at least as many herbs as clinicians');

  const nameSearch = await api('GET', '/api/herbs?q=HERB_REC_0001&limit=20', { token: tokens.editor });
  assert(nameSearch.ok, 'herb name search');
  assert(
    (nameSearch.data.data || []).some((row) => row.code === 'HERB_REC_0001'),
    'q matches code and names'
  );
  assert(nameSearch.data.pagination.total >= 1, 'name search total');

  const { hit } = await findByCode(tokens.clinician, 'HERB_REC_0001');
  assert(hit, 'HERB_REC_0001 in clinician list');

  const detail = await api('GET', `/api/herbs/${hit.id}`, { token: tokens.clinician });
  assert(detail.ok, 'herb detail');
  const herb = detail.data;
  assertEqual(herb.code, 'HERB_REC_0001', 'code');
  assertEqual(String(herb.english_name).toLowerCase(), 'heart leaved moon seed', 'english name');
  assertEqual(String(herb.botanical_name).toLowerCase(), 'tinospora cordifolia', 'botanical');
  assertEqual(herb.status, 'reviewed', 'status');
  assertEqual(herb.virya, 'Ushna', 'virya');
  assertEqual(herb.vipaka, 'Madhura', 'vipaka');
  assert(herb.rasa.includes('Tikta') && herb.rasa.length >= 2, `rasa ${JSON.stringify(herb.rasa)}`);
  assert(herb.guna.includes('Laghu') && herb.guna.includes('Snigdha'), 'guna');
  assertEqual(herb.dhatu.Rasa, 5, 'dhatu rasa');
  assertEqual(herb.dhatu.Rakta, 5, 'dhatu rakta');
  assertEqual(herb.dhatu.Mamsa, 4, 'dhatu mamsa');
  assertEqual(herb.dhatu.Meda, 4, 'dhatu meda');
  assertEqual(herb.dhatu.Asthi, 3, 'dhatu asthi');
  assertEqual(herb.dhatu.Majja, 4, 'dhatu majja');
  assertEqual(herb.dhatu.Shukra, 3, 'dhatu shukra');

  assert(Array.isArray(herb.mala), 'mala array');

  const dosha = Object.fromEntries(herb.dosha_actions.map((row) => [row.dosha, row.effect]));
  assertEqual(dosha.vata, 'pacifies', 'vata');
  assertEqual(dosha.pitta, 'pacifies', 'pitta');
  assertEqual(dosha.kapha, 'pacifies', 'kapha');

  const srotas = herb.srotas;
  for (const name of [
    'Rasavaha',
    'Raktavaha',
    'Mamsavaha',
    'Medovaha',
    'Shukravaha',
    'Mutravaha',
    'Artavavaha',
  ]) {
    assert(srotas.includes(name), `srotas ${name}`);
  }
  assertEqual(srotas.length, 7, 'srotas count');

  const pool = getTestPool();
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'herb_mala'`
  );
  const columns = rows.map((row) => row.column_name);
  assert(columns.includes('effect'), 'herb_mala effect column exists');
  assert(!columns.includes('score'), 'herb_mala uses effects, not numeric scores');
}
