import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readXlsxRows } from '../../utils/xlsxReader.js';
import { createXlsxWorkbook } from '../../utils/xlsxWorkbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_WORKBOOK_PATH = path.resolve(__dirname, '../../../../Dataset/herbs.xlsx');

export const WORKBOOK_COLUMNS = [
  'source_row',
  'record_id',
  'Timestamp',
  'Herb ID',
  'Sanskrit Name',
  'Botanical Name',
  'English Name',
  'Local Name',
  'Family',
  'Part Used',
  'Rasa',
  'Guna',
  'Virya',
  'Vipaka',
  'Prabhava',
  'Dosha Action [Vata]',
  'Dosha Action [Pitta]',
  'Dosha Action [Kapha]',
  'Dhatu Action [Rasa]',
  'Dhatu Action [Rakta]',
  'Dhatu Action [Mamsa]',
  'Dhatu Action [Meda]',
  'Dhatu Action [Asthi]',
  'Dhatu Action [Majja]',
  'Dhatu Action [Shukra]',
  'Mala Action [Purisha]',
  'Mala Action [Mutra]',
  'Mala Action [Sweda]',
  'Srotas Action [Pranavaha]',
  'Srotas Action [Annavaha]',
  'Srotas Action [Udakvaha]',
  'Srotas Action [Rasavaha]',
  'Srotas Action [Raktavaha]',
  'Srotas Action [Mamsavaha]',
  'Srotas Action [Medovaha]',
  'Srotas Action [Asthivaha]',
  'Srotas Action [Majjavaha]',
  'Srotas Action [Shukravaha]',
  'Srotas Action [Mutravaha]',
  'Srotas Action [Swedavaha]',
  'Srotas Action [Purishavaha]',
  'Srotas Action [Artavavaha]',
  'Important Karma',
  'Other Karma',
  'Major Diseases',
  'quality_missing_identity',
  'quality_duplicate_botanical',
  'quality_has_conflicting_duplicate',
];

export function resolveWorkbookPath(customPath) {
  if (customPath) return customPath;
  if (process.env.EXCEL_DATASET_PATH?.trim()) return path.resolve(process.env.EXCEL_DATASET_PATH.trim());
  return DEFAULT_WORKBOOK_PATH;
}

export function ensureWorkbookBackup(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const backupPath = `${filePath}.bak`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    return true;
  }
  return false;
}

function formatCapitalized(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === 'decreases' || s === 'pacifies') return 'Decreases';
  if (s === 'increases') return 'Increases';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mapHerbToWorkbookRow(herb, data = {}, rowNumber = 1) {
  const code = herb.code || data.code || `HERB_${Date.now()}`;
  const englishName = herb.english_name || data.english_name || '';
  const sanskritName = herb.sanskrit_name || data.sanskrit_name || '';
  const botanicalName = herb.botanical_name || data.botanical_name || '';

  // Extract dosha actions
  const doshas = Array.isArray(herb.dosha_actions)
    ? herb.dosha_actions
    : Array.isArray(data.dosha_actions)
    ? data.dosha_actions
    : [];
  const vataAction = doshas.find((d) => d.dosha?.toLowerCase() === 'vata')?.effect;
  const pittaAction = doshas.find((d) => d.dosha?.toLowerCase() === 'pitta')?.effect;
  const kaphaAction = doshas.find((d) => d.dosha?.toLowerCase() === 'kapha')?.effect;

  // Extract dhatu scores
  const dhatuMap = typeof herb.dhatu === 'object' && !Array.isArray(herb.dhatu)
    ? herb.dhatu
    : (data.dhatu || []).reduce((acc, d) => {
        acc[d.term] = d.score;
        return acc;
      }, {});

  // Extract mala actions
  const malaList = Array.isArray(herb.mala) ? herb.mala : data.mala || [];
  const purishaMala = malaList.find((m) => (m.mala || m.term)?.toLowerCase() === 'purisha' || (m.mala || m.term)?.toLowerCase() === 'puresha')?.effect;
  const mutraMala = malaList.find((m) => (m.mala || m.term)?.toLowerCase() === 'mutra')?.effect;
  const swedaMala = malaList.find((m) => (m.mala || m.term)?.toLowerCase() === 'sweda' || (m.mala || m.term)?.toLowerCase() === 'sveda')?.effect;

  // Extract srotas
  const srotasList = (Array.isArray(herb.srotas) ? herb.srotas : data.srotas || []).map((s) => String(s).toLowerCase());
  const hasSrotas = (term) => (srotasList.some((s) => s.includes(term.toLowerCase())) ? 'Yes' : null);

  // Karma & Indications
  const karmaList = Array.isArray(herb.karma) ? herb.karma : Array.isArray(data.karma) ? data.karma.map((k) => (typeof k === 'string' ? k : k.custom || '')) : [];
  const indicationList = Array.isArray(herb.indications) ? herb.indications : Array.isArray(data.indications) ? data.indications.map((i) => (typeof i === 'string' ? i : i.custom || '')) : [];

  return {
    source_row: rowNumber,
    record_id: code,
    Timestamp: Date.now(),
    'Herb ID': sanskritName || englishName || code,
    'Sanskrit Name': sanskritName,
    'Botanical Name': botanicalName,
    'English Name': englishName,
    'Local Name': herb.local_name || data.local_name || '',
    Family: herb.family || data.family || '',
    'Part Used': herb.part_used || data.part_used || '',
    Rasa: Array.isArray(herb.rasa) ? herb.rasa.join(', ') : (data.rasa || []).join(', '),
    Guna: Array.isArray(herb.guna) ? herb.guna.join(', ') : (data.guna || []).join(', '),
    Virya: herb.virya || data.virya || '',
    Vipaka: herb.vipaka || data.vipaka || '',
    Prabhava: herb.prabhava || data.prabhava || '',
    'Dosha Action [Vata]': formatCapitalized(vataAction),
    'Dosha Action [Pitta]': formatCapitalized(pittaAction),
    'Dosha Action [Kapha]': formatCapitalized(kaphaAction),
    'Dhatu Action [Rasa]': dhatuMap['Rasa'] ?? null,
    'Dhatu Action [Rakta]': dhatuMap['Rakta'] ?? null,
    'Dhatu Action [Mamsa]': dhatuMap['Mamsa'] ?? null,
    'Dhatu Action [Meda]': dhatuMap['Meda'] ?? null,
    'Dhatu Action [Asthi]': dhatuMap['Asthi'] ?? null,
    'Dhatu Action [Majja]': dhatuMap['Majja'] ?? null,
    'Dhatu Action [Shukra]': dhatuMap['Shukra'] ?? null,
    'Mala Action [Purisha]': formatCapitalized(purishaMala),
    'Mala Action [Mutra]': formatCapitalized(mutraMala),
    'Mala Action [Sweda]': formatCapitalized(swedaMala),
    'Srotas Action [Pranavaha]': hasSrotas('pranavaha'),
    'Srotas Action [Annavaha]': hasSrotas('annavaha'),
    'Srotas Action [Udakvaha]': hasSrotas('udak'),
    'Srotas Action [Rasavaha]': hasSrotas('rasavaha'),
    'Srotas Action [Raktavaha]': hasSrotas('raktavaha'),
    'Srotas Action [Mamsavaha]': hasSrotas('mamsavaha'),
    'Srotas Action [Medovaha]': hasSrotas('medovaha'),
    'Srotas Action [Asthivaha]': hasSrotas('asthivaha'),
    'Srotas Action [Majjavaha]': hasSrotas('majjavaha'),
    'Srotas Action [Shukravaha]': hasSrotas('shukravaha'),
    'Srotas Action [Mutravaha]': hasSrotas('mutravaha'),
    'Srotas Action [Swedavaha]': hasSrotas('swedavaha'),
    'Srotas Action [Purishavaha]': hasSrotas('purishavaha'),
    'Srotas Action [Artavavaha]': hasSrotas('artavavaha'),
    'Important Karma': karmaList.join(', ') || herb.raw_karma || data.raw_karma || '',
    'Other Karma': '',
    'Major Diseases': indicationList.join(', ') || herb.raw_indication || data.raw_indication || '',
    quality_missing_identity: !sanskritName || !botanicalName,
    quality_duplicate_botanical: false,
    quality_has_conflicting_duplicate: false,
  };
}

export async function syncHerbToWorkbook(herb, data = {}, customPath) {
  const workbookPath = resolveWorkbookPath(customPath);
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Master Excel workbook not found at ${workbookPath}`);
  }

  ensureWorkbookBackup(workbookPath);

  const buffer = fs.readFileSync(workbookPath);
  const existingRows = readXlsxRows(buffer);

  const targetCode = (herb.code || data.code || '').trim().toLowerCase();
  const targetBotanical = (herb.botanical_name || data.botanical_name || '').trim().toLowerCase();

  // Find if row already exists for idempotency
  const existingIndex = existingRows.findIndex((r) => {
    const rCode = String(r.record_id || '').trim().toLowerCase();
    const rBotanical = String(r['Botanical Name'] || '').trim().toLowerCase();
    return (targetCode && rCode === targetCode) || (targetBotanical && rBotanical === targetBotanical);
  });

  const rowNumber = existingIndex >= 0 ? existingRows[existingIndex].source_row : existingRows.length + 2;
  const newRow = mapHerbToWorkbookRow(herb, data, rowNumber);

  if (existingIndex >= 0) {
    existingRows[existingIndex] = { ...existingRows[existingIndex], ...newRow };
  } else {
    existingRows.push(newRow);
  }

  const headerPairs = WORKBOOK_COLUMNS.map((col) => [col, col]);
  const newWorkbookBuffer = createXlsxWorkbook(headerPairs, existingRows, 'herbs');

  // Atomic write via temp file
  const tempPath = `${workbookPath}.tmp-${Date.now()}`;
  fs.writeFileSync(tempPath, newWorkbookBuffer);
  fs.renameSync(tempPath, workbookPath);

  return {
    synced: true,
    action: existingIndex >= 0 ? 'updated' : 'appended',
    recordId: newRow.record_id,
    totalRows: existingRows.length,
    workbookPath,
  };
}
