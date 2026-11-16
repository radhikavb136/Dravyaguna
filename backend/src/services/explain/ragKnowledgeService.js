import { createHash } from 'node:crypto';
import { pool } from '../../db/pool.js';
import { getHerbById } from '../herbs/herbService.js';
import { canSeeDraftHerbs, clinicianVisibleStatuses } from '../../utils/roles.js';

const MAX_CHUNK_CHARS = 1800;

export function chunkText(text, { maxChars = MAX_CHUNK_CHARS } = {}) {
  const paragraphs = String(text || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) chunks.push(current);
      current = '';
      let rest = paragraph;
      while (rest.length > maxChars) {
        let boundary = rest.lastIndexOf(' ', maxChars);
        if (boundary < maxChars * 0.5) boundary = maxChars;
        chunks.push(rest.slice(0, boundary).trim());
        rest = rest.slice(boundary).trim();
      }
      current = rest;
      continue;
    }
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function parseKnowledgeFile(filePath, text) {
  const extension = filePath.split('.').pop().toLowerCase();
  if (extension === 'json' || extension === 'jsonl') {
    const records = extension === 'jsonl'
      ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line))
      : (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [JSON.parse(text)]);
    return records.map((record, index) => {
      if (!record || typeof record !== 'object' || typeof record.content !== 'string' || !record.content.trim()) {
        throw new Error(`Knowledge record ${index + 1} must contain non-empty text content`);
      }
      const sourceIdentifier = String(record.source_id || record.source_identifier || `${filePath}#${index + 1}`);
      return {
        sourceKey: String(record.source_key || `file:${filePath}:${sourceIdentifier}`),
        sourceIdentifier,
        title: String(record.title || sourceIdentifier),
        sourceType: 'text',
        content: record.content.trim(),
        herbCode: record.herb_code ? String(record.herb_code) : null,
        chunks: chunkText(record.content).map((content, chunkIndex) => ({
          content,
          pageNumber: record.page_number || null,
          section: record.section || null,
          metadata: { record_index: index + 1, chunk_index: chunkIndex },
        })),
        metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata : {},
      };
    });
  }

  if (!['md', 'markdown', 'txt'].includes(extension)) {
    throw new Error('Supported knowledge source formats: .md, .markdown, .txt, .json, .jsonl');
  }
  const records = [];
  let section = null;
  let body = [];
  const flush = () => {
    const content = body.join('\n').trim();
    if (!content) return;
    const suffix = records.length ? `#${records.length + 1}` : '';
    const sourceIdentifier = `${filePath}${suffix}`;
    records.push({
      sourceKey: `file:${filePath}${suffix}`,
      sourceIdentifier,
      title: filePath.split(/[\\/]/).pop(),
      sourceType: extension === 'txt' ? 'text' : 'markdown',
      content,
      herbCode: null,
      chunks: chunkText(content).map((chunk) => ({ content: chunk, pageNumber: null, section, metadata: {} })),
      metadata: {},
    });
    body = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      section = heading[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return records;
}

export async function ingestKnowledgeDocument(client, document) {
  if (!document.sourceKey || !document.sourceIdentifier || !document.title || !document.chunks?.length) {
    throw new Error('Knowledge documents require source identity, title, and at least one non-empty chunk');
  }
  const contentHash = digest(JSON.stringify({
    sourceIdentifier: document.sourceIdentifier,
    title: document.title,
    sourceType: document.sourceType,
    herbCode: document.herbCode || null,
    chunks: document.chunks,
    metadata: document.metadata || {},
  }));
  const { rows: existing } = await client.query(
    'SELECT id, content_hash FROM rag_documents WHERE source_key = $1 FOR UPDATE',
    [document.sourceKey]
  );
  if (existing[0]?.content_hash === contentHash) return { changed: false, chunks: document.chunks.length };
  await client.query('DELETE FROM rag_explanation_cache');

  let documentId = existing[0]?.id;
  if (documentId) {
    await client.query(
      `UPDATE rag_documents SET source_identifier = $2, title = $3, source_type = $4,
         content_hash = $5, metadata = $6, updated_at = NOW() WHERE id = $1`,
      [documentId, document.sourceIdentifier, document.title, document.sourceType, contentHash, JSON.stringify(document.metadata || {})]
    );
    await client.query('DELETE FROM rag_chunks WHERE document_id = $1', [documentId]);
  } else {
    const inserted = await client.query(
      `INSERT INTO rag_documents (source_key, source_identifier, title, source_type, content_hash, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [document.sourceKey, document.sourceIdentifier, document.title, document.sourceType || 'text', contentHash, JSON.stringify(document.metadata || {})]
    );
    documentId = inserted.rows[0].id;
  }

  let herbId = null;
  if (document.herbCode) {
    const { rows } = await client.query('SELECT id FROM herbs WHERE code = $1', [document.herbCode]);
    if (!rows[0]) throw new Error(`Knowledge source references unknown herb code: ${document.herbCode}`);
    herbId = rows[0].id;
  }
  for (const [chunkIndex, chunk] of document.chunks.entries()) {
    if (!String(chunk.content || '').trim()) continue;
    await client.query(
      `INSERT INTO rag_chunks (document_id, chunk_index, content, herb_id, page_number, section, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [documentId, chunkIndex, chunk.content, herbId, chunk.pageNumber || null, chunk.section || null, JSON.stringify(chunk.metadata || {})]
    );
  }
  return { changed: true, chunks: document.chunks.length };
}

function herbRecordPayload(herb) {
  return {
    record_type: 'stored herb record',
    code: herb.code,
    status: herb.status,
    english_name: herb.english_name,
    sanskrit_name: herb.sanskrit_name,
    botanical_name: herb.botanical_name,
    local_names: herb.local_names,
    family: herb.family,
    part_used: herb.part_used,
    description: herb.description,
    prabhava: herb.prabhava,
    rasa: herb.rasa,
    guna: herb.guna,
    virya: herb.virya,
    vipaka: herb.vipaka,
    dosha_actions: herb.dosha_actions,
    dhatu: herb.dhatu,
    mala: herb.mala,
    srotas: herb.srotas,
    karma: herb.karma,
    indications: herb.indications,
    references: herb.references,
  };
}

export function herbRecordToEvidence(herb, relevance = 0.9) {
  return {
    content: JSON.stringify(herbRecordPayload(herb)),
    relevance,
    herb_id: herb.id,
    herb_code: herb.code,
    herb_name: herb.english_name,
    source: {
      identifier: `database:herb:${herb.code}`,
      title: `Stored herb record: ${herb.english_name}`,
      type: 'herb_record',
      page: null,
      section: 'Stored herb record',
      metadata: { status: herb.status },
    },
    chunk_metadata: {},
  };
}

async function retrieveHerbRecordEvidence({ searchText, role, herbId, limit, excludeHerbCodes }) {
  const max = Math.min(Math.max(Number(limit) || 5, 1), 10);
  if (max <= 0) return [];
  if (herbId) {
    const herb = await getHerbById(herbId, role);
    if (!herb || excludeHerbCodes.has(herb.code)) return [];
    return [herbRecordToEvidence(herb, 1)];
  }

  const normalized = searchText.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
    .sort((left, right) => right.length - left.length);
  const stopTokens = new Set([
    'what', 'when', 'where', 'which', 'this', 'that', 'with', 'from', 'about', 'does', 'how', 'why',
    'the', 'and', 'for', 'are', 'can', 'you', 'use', 'herb', 'tell', 'please', 'according', 'record', 'stored',
  ]);
  const candidates = [...new Set([normalized, ...tokens])].filter(
    (candidate) => candidate.length >= 3 && !stopTokens.has(candidate)
  );
  if (!candidates.length) return [];

  const statuses = canSeeDraftHerbs(role)
    ? ['draft', 'reviewed', 'verified']
    : clinicianVisibleStatuses();

  const evidence = [];
  for (const candidate of candidates) {
    if (evidence.length >= max) break;
    const { rows } = await pool.query(
      `SELECT id
       FROM herbs
       WHERE status = ANY($1::herb_status[])
         AND (
           lower(english_name) = $2
           OR lower(english_name) LIKE '%' || $2 || '%'
           OR lower(coalesce(botanical_name, '')) LIKE '%' || $2 || '%'
           OR lower(coalesce(sanskrit_name, '')) LIKE '%' || $2 || '%'
           OR lower(coalesce(local_name, '')) LIKE '%' || $2 || '%'
           OR lower(code) = $2
         )
       ORDER BY CASE WHEN lower(english_name) = $2 THEN 0 ELSE 1 END, english_name
       LIMIT $3`,
      [statuses, candidate, max + excludeHerbCodes.size]
    );
    for (const row of rows) {
      const herb = await getHerbById(row.id, role);
      if (!herb || excludeHerbCodes.has(herb.code)) continue;
      excludeHerbCodes.add(herb.code);
      evidence.push(herbRecordToEvidence(herb));
      if (evidence.length >= max) break;
    }
  }
  return evidence;
}

export async function retrieveKnowledge({ question, role, herbId = null, limit = 5 }) {
  const searchText = String(question || '').trim().slice(0, 500);
  if (!searchText) return [];
  const maxResults = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const { rows } = await pool.query(
    `WITH terms AS (
       SELECT DISTINCT token
       FROM regexp_split_to_table(lower($1), '[^[:alnum:]]+') AS token
       WHERE length(token) > 2
         AND token NOT IN ('what', 'when', 'where', 'which', 'this', 'that', 'with', 'from', 'about', 'does', 'how', 'why', 'the', 'and', 'for', 'are', 'can', 'you', 'use', 'herb', 'tell', 'please', 'according')
     ), query AS (
       SELECT COALESCE(to_tsquery('simple', string_agg(token || ':*', ' | ')), ''::tsquery) AS value
       FROM terms
     )
     SELECT c.id, c.content, c.herb_id, c.page_number, c.section, c.metadata AS chunk_metadata,
            d.source_identifier, d.title, d.source_type, d.metadata AS document_metadata,
            h.code AS herb_code, h.english_name AS herb_name, h.status AS herb_status,
            ts_rank_cd(to_tsvector('simple', c.content), query.value)
              + (SELECT count(*)::real FROM terms WHERE c.content ILIKE '%' || terms.token || '%') * 0.1 AS relevance
     FROM rag_chunks c
     JOIN rag_documents d ON d.id = c.document_id
     CROSS JOIN query
     LEFT JOIN herbs h ON h.id = c.herb_id
     WHERE (
         (query.value <> ''::tsquery AND query.value @@ to_tsvector('simple', c.content))
         OR EXISTS (SELECT 1 FROM terms WHERE c.content ILIKE '%' || terms.token || '%')
       )
       AND ($2::uuid IS NULL OR c.herb_id = $2)
       AND (c.herb_id IS NULL OR h.status <> 'archived')
       AND ($3::text <> 'clinician' OR c.herb_id IS NULL OR h.status IN ('reviewed', 'verified'))
       AND (d.metadata->'allowed_roles' IS NULL OR d.metadata->'allowed_roles' = '[]'::jsonb OR d.metadata->'allowed_roles' ? $3)
     ORDER BY relevance DESC, d.title, c.chunk_index
     LIMIT $4`,
    [searchText, herbId, role || 'clinician', maxResults]
  );
  const chunkEvidence = rows.map((row) => ({
    content: row.content,
    relevance: Number(row.relevance),
    herb_id: row.herb_id,
    herb_code: row.herb_code,
    herb_name: row.herb_name,
    source: {
      identifier: row.source_identifier,
      title: row.title,
      type: row.source_type,
      page: row.page_number,
      section: row.section,
      metadata: row.document_metadata,
    },
    chunk_metadata: row.chunk_metadata,
  }));

  const seenHerbCodes = new Set(chunkEvidence.map((item) => item.herb_code).filter(Boolean));
  const herbEvidence = await retrieveHerbRecordEvidence({
    searchText,
    role: role || 'clinician',
    herbId,
    limit: maxResults - chunkEvidence.length,
    excludeHerbCodes: seenHerbCodes,
  });

  return [...chunkEvidence, ...herbEvidence]
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, maxResults);
}

export function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
