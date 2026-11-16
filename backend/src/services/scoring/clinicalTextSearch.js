import { pool } from '../../db/pool.js';
import { clinicianVisibleStatuses, canSeeDraftHerbs } from '../../utils/roles.js';
import { normalizeSimpleQuery } from './simpleSearchMap.js';

function visibleStatusesForRole(role) {
  if (canSeeDraftHerbs(role)) {
    return ['draft', 'reviewed', 'verified'];
  }
  return clinicianVisibleStatuses();
}

function queryTokens(normalizedQuery) {
  const stop = new Set([
    'a', 'an', 'the', 'and', 'or', 'i', 'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were',
    'my', 'me', 'with', 'for', 'to', 'of', 'in', 'on', 'at', 'it', 'this', 'that', 'feel', 'feeling',
    'sometimes', 'often', 'occasional', 'occasionally', 'very', 'really', 'some', 'any',
  ]);
  return normalizedQuery
    .split(/\s+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function scoreRow(row, tokens, normalizedQuery) {
  const haystack = String(row.search_blob || '').toLowerCase();
  if (!haystack) return 0;
  let hits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) hits += 1;
  }
  if (hits === 0) return 0;
  const phraseBonus = haystack.includes(normalizedQuery) ? 15 : 0;
  const base = Math.min(95, 40 + hits * 12 + phraseBonus);
  return base;
}

/**
 * Problem-description search over stored herb text and linked indication/karma labels.
 * Does not invent clinical claims; match notes cite stored fields only.
 */
export async function searchHerbsByClinicalText({ query, role, limit = 20, offset = 0 }) {
  const normalizedQuery = normalizeSimpleQuery(query);
  const tokens = queryTokens(normalizedQuery);
  if (!normalizedQuery || tokens.length === 0) {
    return { results: [], meta: { clinical_text_search: true, matched: false } };
  }

  const statuses = visibleStatusesForRole(role);
  const pattern = `%${tokens.join('%')}%`;

  const { rows } = await pool.query(
    `SELECT h.id, h.code, h.english_name, h.botanical_name, h.sanskrit_name, h.local_name,
            h.part_used, h.prabhava, h.status::text AS status, h.image_url,
            lower(concat_ws(' ',
              h.english_name, h.botanical_name, h.sanskrit_name, h.local_name,
              h.description, h.raw_indication, h.raw_karma, h.part_used, h.prabhava,
              (SELECT string_agg(it.canonical_en, ' ') FROM herb_indications hi
               JOIN indication_terms it ON it.id = hi.indication_id WHERE hi.herb_id = h.id),
              (SELECT string_agg(kt.canonical_en, ' ') FROM herb_karma hk
               JOIN karma_terms kt ON kt.id = hk.karma_id WHERE hk.herb_id = h.id)
            )) AS search_blob
     FROM herbs h
     WHERE h.status = ANY($1::herb_status[])
       AND (
         lower(coalesce(h.english_name, '')) LIKE ANY($2::text[])
         OR lower(coalesce(h.description, '')) LIKE ANY($2::text[])
         OR lower(coalesce(h.raw_indication, '')) LIKE ANY($2::text[])
         OR lower(coalesce(h.raw_karma, '')) LIKE ANY($2::text[])
         OR EXISTS (
           SELECT 1 FROM herb_indications hi
           JOIN indication_terms it ON it.id = hi.indication_id
           WHERE hi.herb_id = h.id AND lower(it.canonical_en) LIKE ANY($2::text[])
         )
         OR EXISTS (
           SELECT 1 FROM herb_karma hk
           JOIN karma_terms kt ON kt.id = hk.karma_id
           WHERE hk.herb_id = h.id AND lower(kt.canonical_en) LIKE ANY($2::text[])
         )
         OR lower(concat_ws(' ', h.description, h.raw_indication, h.raw_karma)) LIKE $3
       )
     LIMIT 200`,
    [statuses, tokens.map((t) => `%${t}%`), pattern]
  );

  const results = rows
    .map((row) => {
      const matchPercentage = scoreRow(row, tokens, normalizedQuery);
      return {
        id: row.id,
        code: row.code,
        englishName: row.english_name,
        botanicalName: row.botanical_name,
        sanskritName: row.sanskrit_name,
        localName: row.local_name,
        partUsed: row.part_used,
        prabhava: row.prabhava,
        status: row.status,
        imageUrl: row.image_url,
        matchPercentage,
        breakdown: [{
          parameter: 'clinical_text',
          matched: matchPercentage > 0,
          score: matchPercentage,
          weight: 100,
          note: 'Matched stored description, indication, karma, or related fields in the database',
        }],
      };
    })
    .filter((row) => row.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(offset, offset + limit);

  return {
    results,
    meta: {
      clinical_text_search: true,
      matched: results.length > 0,
      query: normalizedQuery,
      tokens,
    },
  };
}
