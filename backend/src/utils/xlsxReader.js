import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const MAX_ENTRY_BYTES = 32 * 1024 * 1024;

export function readXlsxRows(buffer) {
  const entries = unzipEntries(buffer);
  const workbookXml = requiredEntry(entries, 'xl/workbook.xml');
  const relationshipsXml = requiredEntry(entries, 'xl/_rels/workbook.xml.rels');
  const relationshipId = workbookXml.match(/<sheet\b[^>]*\br:id="([^"]+)"/i)?.[1];
  if (!relationshipId) throw new Error('Workbook has no worksheet');
  const relationship = [...relationshipsXml.matchAll(/<Relationship\b([^>]+)\/?\s*>/gi)]
    .find((match) => readAttribute(match[1], 'Id') === relationshipId);
  const target = relationship && readAttribute(relationship[1], 'Target');
  if (!target) throw new Error('Workbook worksheet relationship is missing');
  const worksheetName = target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join('xl', target));
  const worksheetXml = requiredEntry(entries, worksheetName);
  const sharedStrings = entries.has('xl/sharedStrings.xml')
    ? [...entries.get('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)]
      .map((match) => [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((text) => decodeXml(text[1])).join(''))
    : [];
  const rows = [...worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)].map((match) => match[1]);
  if (rows.length === 0) return [];
  const table = rows.map((rowXml) => {
    const values = new Map();
    for (const cell of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi)) {
      const reference = readAttribute(cell[1], 'r');
      const index = columnIndex(reference);
      if (index < 0) continue;
      const type = readAttribute(cell[1], 't');
      const content = cell[2] || '';
      const raw = content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1];
      const value = type === 'inlineStr'
        ? [...content.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((text) => decodeXml(text[1])).join('')
        : raw == null ? '' : decodeXml(raw);
      if (type === 's') values.set(index, sharedStrings[Number(value)] ?? '');
      else if (type === 'b') values.set(index, value === '1');
      else if (value !== '' && Number.isFinite(Number(value))) values.set(index, Number(value));
      else values.set(index, value);
    }
    return values;
  });

  const headers = table[0];
  const maxColumn = Math.max(...headers.keys());
  return table.slice(1).map((cells) => Object.fromEntries(
    Array.from({ length: maxColumn + 1 }, (_, index) => [headers.get(index), cells.get(index) ?? null])
      .filter(([header]) => header != null && header !== '')
  ));
}

function unzipEntries(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError('XLSX content must be a Buffer');
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const endOffset = buffer.lastIndexOf(endSignature);
  if (endOffset < 0 || endOffset + 22 > buffer.length) throw new Error('Invalid XLSX ZIP directory');
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid XLSX ZIP entry');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || uncompressedSize > MAX_ENTRY_BYTES) {
      throw new Error('XLSX entry is too large or uses unsupported ZIP64');
    }
    const nameStart = offset + 46;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const contents = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES }) : null;
    if (!contents) throw new Error(`Unsupported XLSX ZIP compression method: ${method}`);
    entries.set(name, contents.toString('utf8'));
    offset = nameStart + nameLength + extraLength + commentLength;
  }
  return entries;
}

function requiredEntry(entries, name) {
  const entry = entries.get(name);
  if (!entry) throw new Error(`XLSX is missing ${name}`);
  return entry;
}

function readAttribute(attributes, name) {
  return attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] || '';
}

function columnIndex(reference) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function decodeXml(value) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
