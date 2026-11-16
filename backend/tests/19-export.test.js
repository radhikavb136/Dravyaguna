import { inflateRawSync } from 'node:zlib';
import { assert, assertEqual } from './lib/assert.js';
import { BASE_URL } from './lib/http.js';
import { getTokens } from './lib/session.js';

export async function run() {
  const { tokens } = await getTokens();
  const clinician = await fetch(`${BASE_URL}/api/admin/export?format=csv`, { headers: { Authorization: `Bearer ${tokens.clinician}` } });
  assertEqual(clinician.status, 403, 'clinicians cannot export the herb dataset');

  const admin = await fetch(`${BASE_URL}/api/admin/export?format=csv`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assertEqual(admin.status, 200, 'admin can export CSV');
  assert(admin.headers.get('content-type')?.includes('text/csv'), 'export uses CSV content type');
  assert(admin.headers.get('content-disposition')?.includes('dravyaguna-herbs.csv'), 'download filename is set');
  const csv = await admin.text();
  assert(csv.includes('"Code","English Name","Sanskrit Name"'), 'CSV header follows the herb master columns');
  assert(csv.split('\r\n').length > 2, 'CSV includes stored herb records');

  const xlsx = await fetch(`${BASE_URL}/api/admin/export?format=xlsx`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assertEqual(xlsx.status, 200, 'admin can export XLSX');
  assert(xlsx.headers.get('content-type')?.includes('spreadsheetml.sheet'), 'XLSX content type is correct');
  assert(xlsx.headers.get('content-disposition')?.includes('dravyaguna-herbs.xlsx'), 'XLSX filename is set');
  const workbook = Buffer.from(await xlsx.arrayBuffer());
  assertEqual(workbook.readUInt32LE(0), 0x04034b50, 'XLSX response is a ZIP workbook');
  const parts = readZipEntries(workbook);
  assert(parts.has('[Content_Types].xml'), 'workbook has content types');
  assert(parts.has('xl/workbook.xml'), 'workbook has a workbook definition');
  const worksheet = parts.get('xl/worksheets/sheet1.xml');
  assert(/<t[^>]*>Code<\/t>/.test(worksheet) && /<t[^>]*>English Name<\/t>/.test(worksheet), 'worksheet uses the herb master headers');
  assert(worksheet.includes('African Baobab'), 'worksheet contains current database records');

  const clinicianXlsx = await fetch(`${BASE_URL}/api/admin/export?format=xlsx`, { headers: { Authorization: `Bearer ${tokens.clinician}` } });
  assertEqual(clinicianXlsx.status, 403, 'clinicians cannot export XLSX');

  const herbsExportDenied = await fetch(`${BASE_URL}/api/herbs/export?format=csv`, {
    headers: { Authorization: `Bearer ${tokens.clinician}` },
  });
  assertEqual(herbsExportDenied.status, 403, 'clinicians cannot export via /api/herbs/export');

  const herbsExportCsv = await fetch(`${BASE_URL}/api/herbs/export?format=csv`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assertEqual(herbsExportCsv.status, 200, 'admin can export CSV via /api/herbs/export');
  const herbsCsv = await herbsExportCsv.text();
  assert(herbsCsv.includes('"Code","English Name","Sanskrit Name"'), 'herbs export CSV matches master header');
  assert(herbsCsv.includes('African Baobab'), 'herbs export CSV includes seeded records');
}

function readZipEntries(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? inflateRawSync(compressed) : compressed;
    entries.set(name, content.toString('utf8'));
    offset = dataStart + compressedSize;
  }
  return entries;
}
