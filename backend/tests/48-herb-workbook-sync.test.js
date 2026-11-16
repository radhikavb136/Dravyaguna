import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_WORKBOOK_PATH,
  WORKBOOK_COLUMNS,
  mapHerbToWorkbookRow,
  syncHerbToWorkbook,
} from '../src/services/herbs/herbWorkbookSyncService.js';
import { readXlsxRows } from '../src/utils/xlsxReader.js';
import { createXlsxWorkbook } from '../src/utils/xlsxWorkbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function run() {
  // 1. Column mapping test
  const herb = {
    code: 'HERB_TEST_001',
    english_name: 'Test Holy Basil',
    sanskrit_name: 'Tulasi',
    botanical_name: 'Ocimum sanctum',
    local_name: 'Tulsi',
    family: 'Lamiaceae',
    part_used: 'leaves',
    virya: 'Ushna',
    vipaka: 'Katu',
    rasa: ['Katu', 'Tikta'],
    guna: ['Laghu', 'Ruksha'],
    dosha_actions: [{ dosha: 'kapha', effect: 'pacifies' }, { dosha: 'vata', effect: 'pacifies' }],
    dhatu: { Rasa: 4, Rakta: 5 },
    mala: [{ mala: 'Sweda', effect: 'increases' }],
    srotas: ['Pranavaha', 'Rasavaha'],
    karma: ['Deepana', 'Pachana'],
    indications: ['Jvara', 'Kasa'],
  };

  const row = mapHerbToWorkbookRow(herb, {}, 10);
  assert.equal(row.record_id, 'HERB_TEST_001');
  assert.equal(row['English Name'], 'Test Holy Basil');
  assert.equal(row['Sanskrit Name'], 'Tulasi');
  assert.equal(row['Botanical Name'], 'Ocimum sanctum');
  assert.equal(row['Virya'], 'Ushna');
  assert.equal(row['Dosha Action [Kapha]'], 'Decreases');
  assert.equal(row['Dhatu Action [Rasa]'], 4);
  assert.equal(row['Srotas Action [Pranavaha]'], 'Yes');
  assert.equal(row['Important Karma'], 'Deepana, Pachana');

  for (const col of WORKBOOK_COLUMNS) {
    assert.ok(col in row, `Missing column ${col} in mapped row`);
  }

  // 2. Append and idempotent update test against a temporary test fixture
  const tempWorkbookPath = path.join(__dirname, 'temp_test_herbs.xlsx');

  // If the proprietary dataset exists locally, use it as template; otherwise generate a synthetic fixture for CI
  if (fs.existsSync(DEFAULT_WORKBOOK_PATH)) {
    fs.copyFileSync(DEFAULT_WORKBOOK_PATH, tempWorkbookPath);
  } else {
    const headerPairs = WORKBOOK_COLUMNS.map((col) => [col, col]);
    const baselineRow = mapHerbToWorkbookRow({
      code: 'HERB_BASELINE_001',
      english_name: 'Baseline Holy Basil',
      sanskrit_name: 'Tulasi',
      botanical_name: 'Ocimum sanctum',
      local_name: 'Tulsi',
      family: 'Lamiaceae',
      part_used: 'leaves',
      virya: 'Ushna',
      vipaka: 'Katu',
      rasa: ['Katu', 'Tikta'],
      guna: ['Laghu', 'Ruksha'],
    }, {}, 2);
    const fixtureBuffer = createXlsxWorkbook(headerPairs, [baselineRow], 'herbs');
    fs.writeFileSync(tempWorkbookPath, fixtureBuffer);
  }

  try {
    const initialRows = readXlsxRows(fs.readFileSync(tempWorkbookPath));
    const initialCount = initialRows.length;
    assert.ok(initialCount > 0, 'Workbook fixture contains initial records');

    const newHerb = {
      code: 'HERB_TEST_SYNC_999',
      english_name: 'Sync Test Herb',
      sanskrit_name: 'SyncHerbSanskrit',
      botanical_name: 'Sync botanicalus',
      local_name: 'SyncLocal',
      virya: 'Sheeta',
      vipaka: 'Madhura',
      rasa: ['Madhura'],
      guna: ['Snigdha'],
    };

    const syncRes1 = await syncHerbToWorkbook(newHerb, {}, tempWorkbookPath);
    assert.equal(syncRes1.synced, true);
    assert.equal(syncRes1.action, 'appended');
    assert.equal(syncRes1.totalRows, initialCount + 1);

    const rowsAfter1 = readXlsxRows(fs.readFileSync(tempWorkbookPath));
    assert.equal(rowsAfter1.length, initialCount + 1);
    const addedRow = rowsAfter1.find((r) => r.record_id === 'HERB_TEST_SYNC_999');
    assert.ok(addedRow, 'Added row should exist in workbook');
    assert.equal(addedRow['English Name'], 'Sync Test Herb');
    assert.equal(addedRow['Botanical Name'], 'Sync botanicalus');

    const updatedHerb = {
      ...newHerb,
      english_name: 'Sync Test Herb Updated',
    };
    const syncRes2 = await syncHerbToWorkbook(updatedHerb, {}, tempWorkbookPath);
    assert.equal(syncRes2.synced, true);
    assert.equal(syncRes2.action, 'updated');
    assert.equal(syncRes2.totalRows, initialCount + 1);

    const rowsAfter2 = readXlsxRows(fs.readFileSync(tempWorkbookPath));
    assert.equal(rowsAfter2.length, initialCount + 1);
    const updatedRow = rowsAfter2.find((r) => r.record_id === 'HERB_TEST_SYNC_999');
    assert.equal(updatedRow['English Name'], 'Sync Test Herb Updated');
  } finally {
    if (fs.existsSync(tempWorkbookPath)) fs.unlinkSync(tempWorkbookPath);
    if (fs.existsSync(`${tempWorkbookPath}.bak`)) fs.unlinkSync(`${tempWorkbookPath}.bak`);
  }

  // 3. Clear actionable error when master workbook does not exist
  const missingWorkbookPath = path.join(__dirname, 'missing_dataset.xlsx');
  await assert.rejects(
    async () => {
      await syncHerbToWorkbook({ code: 'FAIL' }, {}, missingWorkbookPath);
    },
    /Master Excel workbook not found/
  );
}
