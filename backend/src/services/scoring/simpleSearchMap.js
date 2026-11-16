import { pool } from '../../db/pool.js';
import { expandTokensWithVocabularyHints } from './symptomLexicon.js';

export const SIMILARITY_THRESHOLD = 0.45;
export const RELATIVE_CUTOFF = 0.8;
const MAX_FUZZY_MATCHES = 3;

export function normalizeSimpleQuery(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectSearchLanguage(value) {
  if (/[\u0900-\u097f]/u.test(value)) return 'hi-IN';
  if (/[A-Za-z]/u.test(value)) return 'en-IN';
  if (!value) return 'en-IN';
  return 'unsupported';
}

function ngrams(tokens) {
  const values = [];
  for (let size = Math.min(3, tokens.length); size >= 1; size -= 1) {
    for (let start = 0; start <= tokens.length - size; start += 1) {
      values.push({ text: tokens.slice(start, start + size).join(' '), start, size });
    }
  }
  return values;
}

async function loadApprovedTerms() {
  const { rows } = await pool.query(`
    SELECT 'karma'::text AS vocabulary, t.id AS term_id, t.canonical_en,
           lower(t.canonical_en) AS text, 1 AS canonical
    FROM karma_terms t
    UNION ALL
    SELECT 'indication', t.id, t.canonical_en, lower(t.canonical_en), 1
    FROM indication_terms t
    UNION ALL
    SELECT 'karma'::text, s.term_id, t.canonical_en, lower(s.text), 0
    FROM term_synonyms s
    JOIN karma_terms t ON s.vocabulary IN ('karma', 'karma_terms') AND s.term_id = t.id
    WHERE s.language_code = 'en-IN' AND s.approval_status = 'approved'
    UNION ALL
    SELECT 'indication'::text, s.term_id, t.canonical_en, lower(s.text), 0
    FROM term_synonyms s
    JOIN indication_terms t ON s.vocabulary IN ('indication', 'indication_terms') AND s.term_id = t.id
    WHERE s.language_code = 'en-IN' AND s.approval_status = 'approved'
  `);
  return rows;
}

export async function mapQueryToFilterIds(query) {
  const normalized = normalizeSimpleQuery(query);
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  const matched = [];
  const matchedTokenIndexes = new Set();
  const ids = { karma: new Set(), indication: new Set() };

  if (!tokens.length) {
    return { karmaIds: [], indicationIds: [], matchedTerms: [], unmatchedTokens: [] };
  }

  const hintExpansion = await expandTokensWithVocabularyHints(tokens);
  for (const id of hintExpansion.karmaIds) ids.karma.add(id);
  for (const id of hintExpansion.indicationIds) ids.indication.add(id);
  matched.push(...hintExpansion.matchedTerms);
  for (const match of hintExpansion.matchedTerms) {
    const idx = tokens.indexOf(match.term);
    if (idx >= 0) matchedTokenIndexes.add(idx);
  }

  const terms = await loadApprovedTerms();
  const exactByText = new Map();
  for (const row of terms) {
    const key = normalizeSimpleQuery(row.text);
    const candidates = exactByText.get(key) || [];
    candidates.push(row);
    exactByText.set(key, candidates);
  }

  // Prefer exact canonical labels and expert-entered synonyms, longest phrase first.
  for (const candidate of ngrams(tokens)) {
    const indexes = Array.from({ length: candidate.size }, (_, i) => candidate.start + i);
    if (indexes.some((index) => matchedTokenIndexes.has(index))) continue;
    const hits = exactByText.get(candidate.text);
    if (!hits?.length) continue;
    const uniqueHits = new Map(hits.map((hit) => [`${hit.vocabulary}:${hit.term_id}`, hit]));
    for (const hit of uniqueHits.values()) {
      ids[hit.vocabulary].add(hit.term_id);
      matched.push({
        term: candidate.text,
        canonical: hit.canonical_en,
        vocabulary: hit.vocabulary,
        similarity: 1,
        matchType: hit.canonical ? 'canonical' : 'approved_synonym',
      });
    }
    indexes.forEach((index) => matchedTokenIndexes.add(index));
  }

  // Fuzzy matches only target existing canonical terms or expert-entered synonyms.
  // They are used for this search request and never create or persist vocabulary links.
  const pendingFuzzy = ngrams(tokens).filter((candidate) => {
    const indexes = Array.from({ length: candidate.size }, (_, i) => candidate.start + i);
    return candidate.size === 1 && !indexes.some((index) => matchedTokenIndexes.has(index));
  });
  const fuzzyRows = pendingFuzzy.length
    ? await pool.query(
        `WITH input AS (
           SELECT DISTINCT unnest($1::text[]) AS query_text
         ), candidates AS (
           SELECT 'karma'::text AS vocabulary, t.id AS term_id, t.canonical_en,
                  lower(t.canonical_en) AS text
           FROM karma_terms t
           UNION ALL
           SELECT 'indication', t.id, t.canonical_en, lower(t.canonical_en)
           FROM indication_terms t
           UNION ALL
           SELECT 'karma'::text, s.term_id, t.canonical_en, lower(s.text)
           FROM term_synonyms s
           JOIN karma_terms t ON s.vocabulary IN ('karma', 'karma_terms') AND s.term_id = t.id
           WHERE s.language_code = 'en-IN' AND s.approval_status = 'approved'
           UNION ALL
           SELECT 'indication'::text, s.term_id, t.canonical_en, lower(s.text)
           FROM term_synonyms s
           JOIN indication_terms t ON s.vocabulary IN ('indication', 'indication_terms') AND s.term_id = t.id
           WHERE s.language_code = 'en-IN' AND s.approval_status = 'approved'
         )
         SELECT input.query_text, candidates.vocabulary, candidates.term_id,
                candidates.canonical_en, MAX(similarity(candidates.text, input.query_text)) AS similarity
         FROM input CROSS JOIN candidates
         WHERE similarity(candidates.text, input.query_text) >= $2
         GROUP BY input.query_text, candidates.vocabulary, candidates.term_id, candidates.canonical_en
         ORDER BY input.query_text, similarity DESC`,
        [pendingFuzzy.map(({ text }) => text), SIMILARITY_THRESHOLD]
      )
    : { rows: [] };
  const fuzzyByQuery = new Map();
  for (const row of fuzzyRows.rows) {
    const rows = fuzzyByQuery.get(row.query_text) || [];
    rows.push({ ...row, similarity: Number(row.similarity) });
    fuzzyByQuery.set(row.query_text, rows);
  }

  for (const candidate of pendingFuzzy) {
    const indexes = Array.from({ length: candidate.size }, (_, i) => candidate.start + i);
    if (indexes.some((index) => matchedTokenIndexes.has(index))) continue;
    const scored = fuzzyByQuery.get(candidate.text) || [];
    if (!scored.length) continue;
    const cutoff = Math.max(SIMILARITY_THRESHOLD, scored[0].similarity * RELATIVE_CUTOFF);
    const selected = new Map();
    for (const term of scored.filter((item) => item.similarity >= cutoff)) {
      selected.set(`${term.vocabulary}:${term.term_id}`, term);
      if (selected.size >= MAX_FUZZY_MATCHES) break;
    }
    if (!selected.size) continue;
    for (const hit of selected.values()) {
      ids[hit.vocabulary].add(hit.term_id);
      matched.push({
        term: candidate.text,
        canonical: hit.canonical_en,
        vocabulary: hit.vocabulary,
        similarity: Number(hit.similarity.toFixed(3)),
        matchType: 'fuzzy',
      });
    }
    indexes.forEach((index) => matchedTokenIndexes.add(index));
  }

  return {
    karmaIds: [...ids.karma],
    indicationIds: [...ids.indication],
    matchedTerms: matched,
    unmatchedTokens: tokens.filter((_, index) => !matchedTokenIndexes.has(index)),
  };
}
