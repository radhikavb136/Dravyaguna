import { assert, assertEqual } from './lib/assert.js';
import { isSourceQualityFlag, sourceReviewStatus } from '../src/services/herbs/sourceQuality.js';
import { createXlsxWorkbook } from '../src/utils/xlsxWorkbook.js';
import { readXlsxRows } from '../src/utils/xlsxReader.js';

export async function run() {
  for (const value of [true, 1, '1', 'true', 'TRUE', 'yes', ' Yes ']) {
    assertEqual(isSourceQualityFlag(value), true, `quality flag recognizes ${String(value)}`);
  }
  for (const value of [false, 0, '0', 'false', '', null, undefined]) {
    assertEqual(isSourceQualityFlag(value), false, `quality flag rejects ${String(value)}`);
  }

  for (const column of [
    'quality_missing_identity',
    'quality_duplicate_botanical',
    'quality_has_conflicting_duplicate',
  ]) {
    assertEqual(sourceReviewStatus({ [column]: 1 }), 'draft', `${column} numeric 1 makes a source row draft`);
    assertEqual(sourceReviewStatus({ [column]: '1' }), 'draft', `${column} string 1 makes a source row draft`);
  }
  assertEqual(sourceReviewStatus({ quality_missing_identity: 0, quality_duplicate_botanical: '0' }), 'reviewed', 'zero-valued source quality flags remain reviewed');
  assert(sourceReviewStatus({}) === 'reviewed', 'rows without quality flags remain reviewed');

  const workbook = createXlsxWorkbook([
    ['record_id', 'record_id'],
    ['quality_missing_identity', 'quality_missing_identity'],
    ['quality_duplicate_botanical', 'quality_duplicate_botanical'],
    ['quality_has_conflicting_duplicate', 'quality_has_conflicting_duplicate'],
  ], [
    { record_id: 'HERB_REC_0001', quality_missing_identity: 0, quality_duplicate_botanical: 0, quality_has_conflicting_duplicate: 0 },
    { record_id: 'HERB_REC_0002', quality_missing_identity: 1, quality_duplicate_botanical: 0, quality_has_conflicting_duplicate: 0 },
  ]);
  const rows = readXlsxRows(workbook);
  assertEqual(rows.length, 2, 'XLSX reader returns worksheet data rows');
  assertEqual(rows[0].record_id, 'HERB_REC_0001', 'XLSX reader retains shared column positions');
  assertEqual(sourceReviewStatus(rows[0]), 'reviewed', 'XLSX numeric zero flags remain reviewed');
  assertEqual(sourceReviewStatus(rows[1]), 'draft', 'XLSX numeric one flags remain draft');
}
