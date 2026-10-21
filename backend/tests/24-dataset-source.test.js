import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEqual } from './lib/assert.js';
import { sourceReviewStatus } from '../src/services/herbs/sourceQuality.js';
import { readXlsxRows } from '../src/utils/xlsxReader.js';

export async function run() {
  const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const sourcePath = path.resolve(backendRoot, '../Dataset/herbs.xlsx');
  if (!fs.existsSync(sourcePath)) return;

  const rows = readXlsxRows(fs.readFileSync(sourcePath));
  assertEqual(rows.length, 176, 'company workbook contains 176 records');
  const reviewed = rows.filter((row) => sourceReviewStatus(row) === 'reviewed').length;
  const draft = rows.filter((row) => sourceReviewStatus(row) === 'draft').length;
  assertEqual(reviewed, 134, 'unflagged source records are reviewed');
  assertEqual(draft, 42, 'quality-flagged source records remain drafts');
}
