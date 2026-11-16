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
import { searchHerbsByName } from './herbNameSearch.js';
import { searchHerbsByClinicalText } from './clinicalTextSearch.js';
import { getLearnedBoostsForQuery } from '../learning/selfLearningService.js';

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
  const hasUserFilters = Object.values(requestedFilters).some(
    (value) => Array.isArray(value) && value.length > 0
  );
  if (normalizedQuery && !mapped.karmaIds.length && !mapped.indicationIds.length && !hasRequestedFilters) {
    const nameSearch = await searchHerbsByName({
      query: normalizedQuery,
      role,
      limit,
      offset,
    });
    if (nameSearch.results.length > 0) {
      return {
        results: nameSearch.results,
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
          name_search: true,
          ...nameSearch.meta,
        },
      };
    }

    const clinicalSearch = await searchHerbsByClinicalText({
      query: normalizedQuery,
      role,
      limit,
      offset,
    });
    if (clinicalSearch.results.length > 0) {
      return {
        results: clinicalSearch.results,
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
          ...clinicalSearch.meta,
        },
      };
    }

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
        note: note || 'No herbs matched this description in the current database. Try different words or use Detailed Search.',
      },
    };
  }

  const searchResult = await runDetailedSearch({
    filters,
    role,
    limit: Math.max(limit, 50),
    offset: 0,
  });

  const shouldBlendClinical =
    normalizedQuery &&
    !hasUserFilters &&
    (mapped.unmatchedTokens.length > 0 ||
      mapped.matchedTerms.some((term) => term.matchType === 'english_symptom_hint'));

  if (shouldBlendClinical) {
    const clinicalSearch = await searchHerbsByClinicalText({
      query: normalizedQuery,
      role,
      limit: Math.max(limit, 50),
      offset: 0,
    });
    const byId = new Map(searchResult.results.map((row) => [row.id, row]));
    for (const row of clinicalSearch.results) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    const merged = [...byId.values()].sort((a, b) => b.matchPercentage - a.matchPercentage);
    if (merged.length > 0) {
      return {
        results: merged.slice(offset, offset + limit),
        meta: {
          ...searchResult.meta,
          query,
          matched_terms: mapped.matchedTerms,
          unmatched_tokens: mapped.unmatchedTokens,
          language,
          displayLanguage,
          note,
          clinical_text_search: true,
          blended_with_detailed: true,
        },
      };
    }
  }

  if (searchResult.results.length === 0 && normalizedQuery) {
    const nameSearch = await searchHerbsByName({
      query: normalizedQuery,
      role,
      limit,
      offset,
    });
    if (nameSearch.results.length > 0) {
      return {
        results: nameSearch.results,
        meta: {
          dbDurationMs: searchResult.meta.dbDurationMs,
          unresolved: searchResult.meta.unresolved,
          activeFilterGroups: searchResult.meta.activeFilterGroups,
          query: normalizedQuery,
          matched_terms: mapped.matchedTerms,
          unmatched_tokens: mapped.unmatchedTokens,
          language,
          displayLanguage,
          note,
          name_search: true,
          ...nameSearch.meta,
        },
      };
    }

    const clinicalSearch = await searchHerbsByClinicalText({
      query: normalizedQuery,
      role,
      limit,
      offset,
    });
    if (clinicalSearch.results.length > 0) {
      let clinicalResults = clinicalSearch.results;
      if (normalizedQuery && clinicalResults.length > 0) {
        try {
          const boostMap = await getLearnedBoostsForQuery(normalizedQuery);
          if (boostMap && boostMap.size > 0) {
            clinicalResults = clinicalResults.map((herb) => {
              const boost = boostMap.get(herb.id);
              if (!boost) return herb;
              const boostedScore = Math.min(100, Math.round(herb.matchPercentage + boost.relevanceBoost));
              const breakdown = Array.isArray(herb.breakdown) ? [...herb.breakdown] : [];
              breakdown.push({
                parameter: 'self_learning_boost',
                matched: true,
                score: boost.relevanceBoost,
                note: `Relevance boosted by Self-Learning AI Model (${Math.round(boost.confidence * 100)}% confidence)`,
              });
              return { ...herb, matchPercentage: boostedScore, breakdown };
            }).sort((a, b) => b.matchPercentage - a.matchPercentage);
          }
        } catch { /* non-blocking */ }
      }
      return {
        results: clinicalResults.slice(offset, offset + limit),
        meta: {
          dbDurationMs: searchResult.meta.dbDurationMs,
          unresolved: searchResult.meta.unresolved,
          activeFilterGroups: searchResult.meta.activeFilterGroups,
          query: normalizedQuery,
          matched_terms: mapped.matchedTerms,
          unmatched_tokens: mapped.unmatchedTokens,
          language,
          displayLanguage,
          note,
          ...clinicalSearch.meta,
        },
      };
    }
  }

  let finalResults = searchResult.results;
  if (normalizedQuery && finalResults.length > 0) {
    try {
      const boostMap = await getLearnedBoostsForQuery(normalizedQuery);
      if (boostMap && boostMap.size > 0) {
        finalResults = finalResults.map((herb) => {
          const boost = boostMap.get(herb.id);
          if (!boost) return herb;
          const boostedScore = Math.min(100, Math.round(herb.matchPercentage + boost.relevanceBoost));
          const breakdown = Array.isArray(herb.breakdown) ? [...herb.breakdown] : [];
          breakdown.push({
            parameter: 'self_learning_boost',
            matched: true,
            score: boost.relevanceBoost,
            note: `Relevance boosted by Self-Learning AI Model (${Math.round(boost.confidence * 100)}% confidence)`,
          });
          return { ...herb, matchPercentage: boostedScore, breakdown };
        }).sort((a, b) => b.matchPercentage - a.matchPercentage);
      }
    } catch { /* non-blocking */ }
  }

  return {
    results: finalResults.slice(offset, offset + limit),
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
    sanskritName: row.sanskrit_name,
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
