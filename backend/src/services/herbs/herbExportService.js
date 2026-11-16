import { pool } from '../../db/pool.js';
import { createXlsxWorkbook } from '../../utils/xlsxWorkbook.js';

export const HERB_EXPORT_HEADERS = [
  ['code', 'Code'],
  ['english_name', 'English Name'],
  ['sanskrit_name', 'Sanskrit Name'],
  ['botanical_name', 'Botanical Name'],
  ['local_name', 'Local Name'],
  ['family', 'Family'],
  ['part_used', 'Part Used'],
  ['description', 'Description'],
  ['rasa', 'Rasa'],
  ['guna', 'Guna'],
  ['virya', 'Virya'],
  ['vipaka', 'Vipaka'],
  ['prabhava', 'Prabhava'],
  ['dosha_actions', 'Dosha Actions'],
  ['dhatu', 'Dhatu'],
  ['mala', 'Mala'],
  ['srotas', 'Srotas'],
  ['avayava', 'Avayava'],
  ['karma', 'Karma'],
  ['indications', 'Indications'],
  ['raw_karma', 'Raw Karma'],
  ['raw_indication', 'Raw Indications'],
  ['status', 'Status'],
  ['image_url', 'Image URL'],
  ['references', 'References'],
];

const HERB_EXPORT_QUERY = `
  SELECT h.code, h.english_name, h.sanskrit_name, h.botanical_name, h.local_name, h.family,
         h.part_used, h.description,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_rasa j JOIN rasa_terms t ON t.id=j.rasa_id WHERE j.herb_id=h.id) AS rasa,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_guna j JOIN guna_terms t ON t.id=j.guna_id WHERE j.herb_id=h.id) AS guna,
         (SELECT canonical_en FROM virya_terms WHERE id=h.virya_id) AS virya,
         (SELECT canonical_en FROM vipaka_terms WHERE id=h.vipaka_id) AS vipaka,
         h.prabhava,
         (SELECT string_agg(d.dosha::text || ':' || d.effect::text, '; ' ORDER BY d.dosha) FROM herb_dosha_actions d WHERE d.herb_id=h.id) AS dosha_actions,
         (SELECT string_agg(t.canonical_en || ':' || j.score::text, '; ' ORDER BY t.canonical_en) FROM herb_dhatu j JOIN dhatu_terms t ON t.id=j.dhatu_id WHERE j.herb_id=h.id) AS dhatu,
         (SELECT string_agg(t.canonical_en || ':' || j.effect::text, '; ' ORDER BY t.canonical_en) FROM herb_mala j JOIN mala_terms t ON t.id=j.mala_id WHERE j.herb_id=h.id) AS mala,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_srotas j JOIN srotas_terms t ON t.id=j.srotas_id WHERE j.herb_id=h.id) AS srotas,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_avayava j JOIN avayava_terms t ON t.id=j.avayava_id WHERE j.herb_id=h.id) AS avayava,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_karma j JOIN karma_terms t ON t.id=j.karma_id WHERE j.herb_id=h.id) AS karma,
         (SELECT string_agg(t.canonical_en, '; ' ORDER BY t.canonical_en) FROM herb_indications j JOIN indication_terms t ON t.id=j.indication_id WHERE j.herb_id=h.id) AS indications,
         h.raw_karma, h.raw_indication, h.status::text AS status, h.image_url,
         (SELECT string_agg(concat_ws(' | ', r.source, r.chapter_ref, r.citation_text), '; ' ORDER BY r.id) FROM herb_references r WHERE r.herb_id=h.id) AS references
  FROM herbs h ORDER BY h.code
`;

export async function fetchHerbExportRows() {
  const { rows } = await pool.query(HERB_EXPORT_QUERY);
  return rows;
}

export function sendHerbExportResponse(res, format, rows) {
  const headers = HERB_EXPORT_HEADERS;
  if (format === 'xlsx') {
    const workbook = createXlsxWorkbook(headers, rows);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="dravyaguna-herbs.xlsx"',
      'Cache-Control': 'no-store',
    });
    return res.send(workbook);
  }
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    headers.map(([, label]) => csvCell(label)).join(','),
    ...rows.map((row) => headers.map(([key]) => csvCell(row[key])).join(',')),
  ].join('\r\n');
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="dravyaguna-herbs.csv"',
    'Cache-Control': 'no-store',
  });
  return res.send(`\uFEFF${csv}`);
}
