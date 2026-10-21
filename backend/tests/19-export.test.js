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
  assertEqual(xlsx.status, 501, 'XLSX remains explicitly unsupported instead of returning fake data');
}
