import { pool } from '../../db/pool.js';
import { clinicianVisibleStatuses, canSeeDraftHerbs } from '../../utils/roles.js';
import { buildSearchQuery } from './buildSearchQuery.js';
import { getScoringWeights } from './weightsCache.js';
import { resolveSearchFilters } from './resolveFilters.js';
import { translateSearchQueryToEnglish } from '../translations/searchTranslationService.js';
import {
  detectSearchLanguage,
  mapQueryToFilterIds,
  normalizeSimpleQuery,
} from './simpleSearchMap.js';

function visibleStatusesForRole(role) {
  if (canSeeDraftHerbs(role)) {
    return ['draft', 'reviewed', 'verified'];
  }
  return clinicianVisibleStatuses();
}

export async function runDetailedSearch({ filters, role, limit, offset }) {
  const criteria = await resolveSearchFilters(filters);
  const weights = await getScoringWeights();
  const statuses = visibleStatusesForRole(role);

  const { sql, params } = buildSearchQuery(criteria, weights, {
    statuses,
    limit,
    offset,
  });

  const start = process.hrtime.bigint();
  const { rows } = await pool.query(sql, params);
  const dbDurationMs = Number(process.hrtime.bigint() - start) / 1e6;

  return {
    results: rows.map(formatSearchRow),
    meta: {
      dbDurationMs,
      unresolved: criteria.unresolved,
      activeFilterGroups: countActiveGroups(criteria),
    },
  };
}

export async function runSimpleSearch({ query, lang, filters: requestedFilters = {}, role, limit, offset, translationProvider }) {
  const normalizedQuery = normalizeSimpleQuery(query);
  const detectedLanguage = detectSearchLanguage(normalizedQuery);
  const language = detectedLanguage === 'hi-IN'
    ? (lang === 'sa-IN' ? 'sa-IN' : lang === 'mr-IN' ? 'mr-IN' : 'hi-IN')
    : detectedLanguage;
  const displayLanguage = lang || language;
  let searchText = normalizedQuery;
  let note;
  if (language === 'hi-IN' || language === 'mr-IN') {
    try {
      const translated = await translateSearchQueryToEnglish(normalizedQuery, language, translationProvider);
      if (translated.unavailable) {
        note = 'Search translation is not configured. The query was not interpreted.';
        searchText = '';
      } else {
        searchText = normalizeSimpleQuery(translated.text);
      }
    } catch {
      note = 'Search translation is temporarily unavailable. The query was not interpreted.';
      searchText = '';
    }
  } else if (language !== 'en-IN') {
    note = 'This search language is not supported yet. Search text is not interpreted.';
    searchText = '';
  }
  const mapped = searchText
    ? await mapQueryToFilterIds(searchText)
    : { karmaIds: [], indicationIds: [], matchedTerms: [], unmatchedTokens: normalizedQuery.split(/\s+/u).filter(Boolean) };
  const filters = { ...requestedFilters };

  if (mapped.karmaIds.length) {
    const { rows } = await pool.query(
      `SELECT canonical_en FROM karma_terms WHERE id = ANY($1::int[])`,
      [mapped.karmaIds]
    );
    filters.karma = [...new Set([...(filters.karma || []), ...rows.map((r) => r.canonical_en)])];
  }

  if (mapped.indicationIds.length) {
    const { rows } = await pool.query(
      `SELECT canonical_en FROM indication_terms WHERE id = ANY($1::int[])`,
      [mapped.indicationIds]
    );
    filters.indication = [...new Set([...(filters.indication || []), ...rows.map((r) => r.canonical_en)])];
  }

  const hasRequestedFilters = Object.values(filters).some(
    (value) => Array.isArray(value) && value.length > 0
  );
  if (normalizedQuery && !mapped.karmaIds.length && !mapped.indicationIds.length && !hasRequestedFilters) {
    return {
      results: [],
      meta: {
        dbDurationMs: 0,
        unresolved: {},
        activeFilterGroups: 0,
        query: normalizedQuery,
        matched_terms: mapped.matchedTerms,
        unmatched_tokens: mapped.unmatchedTokens,
        language,
        displayLanguage,
        note,
      },
    };
  }

  const searchResult = await runDetailedSearch({
    filters,
    role,
    limit,
    offset,
  });

  return {
    ...searchResult,
    meta: {
      ...searchResult.meta,
      query,
      matched_terms: mapped.matchedTerms,
      unmatched_tokens: mapped.unmatchedTokens,
      language,
      displayLanguage,
      note,
    },
  };
}

function formatSearchRow(row) {
  return {
    id: row.id,
    code: row.code,
    englishName: row.english_name,
    botanicalName: row.botanical_name,
    partUsed: row.part_used,
    prabhava: row.prabhava,
    status: row.status,
    imageUrl: row.image_url,
    matchPercentage: Number(row.match_percentage),
    breakdown: row.breakdown,
  };
}

function countActiveGroups(criteria) {
  let n = 0;
  if (criteria.rasaIds?.length) n += 1;
  if (criteria.gunaIds?.length) n += 1;
  if (criteria.karmaIds?.length) n += 1;
  if (criteria.indicationIds?.length) n += 1;
  if (criteria.dhatuIds?.length) n += 1;
  if (criteria.malaIds?.length) n += 1;
  if (criteria.srotasIds?.length) n += 1;
  if (criteria.avayavaIds?.length) n += 1;
  if (criteria.viryaId) n += 1;
  if (criteria.vipakaId) n += 1;
  if (criteria.doshaSelections?.length) n += 1;
  if (criteria.prabhavaTerms?.length) n += 1;
  return n;
}

export async function logSearchEvent({
  userId,
  mode,
  queryText,
  filtersJson,
  lang,
  resultCount,
  topMatchPct,
  dbDurationMs,
}) {
  await pool.query(
    `INSERT INTO search_events
      (user_id, mode, query_text, filters_json, lang, result_count, top_match_pct, db_duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId ?? null,
      mode,
      queryText ?? null,
      filtersJson ? JSON.stringify(filtersJson) : null,
      lang ?? null,
      resultCount,
      topMatchPct ?? null,
      dbDurationMs ?? null,
    ]
  );
}
