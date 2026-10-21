import { createHash } from 'node:crypto';
import { pool } from '../../db/pool.js';
import { getHerbById } from '../herbs/herbService.js';
import { runDetailedSearch } from '../scoring/searchService.js';
import { configuredLlmProvider } from './llmProvider.js';

const MAX_EXPLANATION_LENGTH = 1200;
const inFlight = new Map();

export const EXPLANATION_SYSTEM_PROMPT = [
  'Explain only the supplied retrieved JSON, briefly and in the requested language.',
  'Do not add facts that are absent from the JSON.',
  'Do not give dosages, contraindications, safety advice, or unsupported clinical claims.',
  'If the data does not support an answer, say so.',
  'When references are supplied, cite them by their source and citation text.',
].join(' ');

export async function generateExplanation({ herbId, filters = {}, lang = 'en-IN', role }, options = {}) {
  const provider = options.provider || configuredLlmProvider();
  const normalizedFilters = stableValue(filters);
  const filtersHash = hash(normalizedFilters);
  const cacheKey = hash({
    herbId,
    filters: normalizedFilters,
    lang,
    provider: provider.name,
    model: provider.model || '',
  });

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
  const pending = generateAndCache({
    herbId,
    filters,
    normalizedFilters,
    filtersHash,
    cacheKey,
    lang,
    role,
    provider,
  });
  inFlight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    inFlight.delete(cacheKey);
  }
}

async function generateAndCache({ herbId, filters, normalizedFilters, filtersHash, cacheKey, lang, role, provider }) {
  const herb = await getHerbById(herbId, role);
  if (!herb) return null;

  const score = hasFilters(filters)
    ? (await runDetailedSearch({ filters, role, limit: 200, offset: 0 })).results.find((row) => row.id === herbId)
    : null;
  const citations = (herb.references || []).map((reference) => ({
    source: reference.source || '',
    chapter: reference.chapter || '',
    verse: reference.verse || '',
    notes: reference.notes || '',
  }));
  const structured = {
    matchPercentage: score?.matchPercentage ?? null,
    breakdown: score?.breakdown || [],
  };
  const retrievedData = {
    requested_language: lang,
    herb: {
      id: herb.id,
      english_name: herb.english_name,
      sanskrit_name: herb.sanskrit_name,
      botanical_name: herb.botanical_name,
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
    },
    scoring: structured,
    references: citations,
  };

  const { rows: cached } = await pool.query(
    `SELECT explanation_text FROM rag_explanation_cache WHERE cache_key = $1`,
    [cacheKey]
  );
  if (cached[0]) {
    return {
      explanation: cached[0].explanation_text,
      ai_generated: true,
      citations,
      lang,
      provider: provider.name,
      cache_hit: true,
      structured,
    };
  }

  let explanation;
  try {
    explanation = String(
      await provider.generate({ system: EXPLANATION_SYSTEM_PROMPT, retrievedData })
    ).trim().slice(0, MAX_EXPLANATION_LENGTH);
    if (!explanation) throw new Error('LLM provider returned an empty explanation');
  } catch {
    return {
      explanation: null,
      ai_generated: false,
      explanation_unavailable: true,
      message: 'Explanation unavailable. The retrieved herb record and structured scoring are still available.',
      citations,
      lang,
      provider: provider.name,
      structured,
    };
  }

  let cacheSaved = true;
  try {
    await pool.query(
      `INSERT INTO rag_explanation_cache (cache_key, herb_id, filters_hash, explanation_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cache_key) DO UPDATE SET explanation_text = EXCLUDED.explanation_text`,
      [cacheKey, herbId, filtersHash, explanation]
    );
  } catch {
    cacheSaved = false;
  }
  return {
    explanation,
    ai_generated: true,
    citations,
    lang,
    provider: provider.name,
    cache_hit: false,
    cache_saved: cacheSaved,
    structured,
  };
}

function hasFilters(filters) {
  return Object.values(filters || {}).some((value) => Array.isArray(value) && value.length > 0);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function canonicalFiltersHash(filters) {
  return hash(stableValue(filters || {}));
}
