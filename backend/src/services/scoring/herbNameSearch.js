import { pool } from '../../db/pool.js';
import { clinicianVisibleStatuses, canSeeDraftHerbs } from '../../utils/roles.js';
import { normalizeSimpleQuery } from './simpleSearchMap.js';

function visibleStatusesForRole(role) {
  if (canSeeDraftHerbs(role)) {
    return ['draft', 'reviewed', 'verified'];
  }
  return clinicianVisibleStatuses();
}

function nameMatchScore(row, normalizedQuery) {
  const fields = [
    { value: row.english_name, exact: 100, partial: 85 },
    { value: row.botanical_name, exact: 95, partial: 80 },
    { value: row.sanskrit_name, exact: 92, partial: 78 },
    { value: row.local_name, exact: 90, partial: 75 },
  ];
  let best = 0;
  for (const field of fields) {
    const text = String(field.value || '').trim().toLowerCase();
    if (!text) continue;
    if (text === normalizedQuery) best = Math.max(best, field.exact);
    else if (text.includes(normalizedQuery) || normalizedQuery.includes(text)) {
      best = Math.max(best, field.partial);
    }
  }
  return best;
}

/**
 * Name-only simple search when karma/indication mapping finds nothing.
 * Uses stored herb name fields only (no invented clinical content).
 */
export async function searchHerbsByName({ query, role, limit = 20, offset = 0 }) {
  const normalizedQuery = normalizeSimpleQuery(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return { results: [], meta: { name_search: true, matched: false } };
  }

  const statuses = visibleStatusesForRole(role);
  const { rows } = await pool.query(
    `SELECT h.id, h.code, h.english_name, h.botanical_name, h.sanskrit_name, h.local_name,
            h.part_used, h.prabhava, h.status::text AS status, h.image_url
     FROM herbs h
     WHERE h.status = ANY($1::herb_status[])
       AND (
         lower(h.english_name) = $2
         OR lower(coalesce(h.botanical_name, '')) = $2
         OR lower(coalesce(h.sanskrit_name, '')) = $2
         OR lower(coalesce(h.local_name, '')) = $2
         OR lower(h.english_name) LIKE '%' || $2 || '%'
         OR lower(coalesce(h.botanical_name, '')) LIKE '%' || $2 || '%'
         OR lower(coalesce(h.sanskrit_name, '')) LIKE '%' || $2 || '%'
         OR lower(coalesce(h.local_name, '')) LIKE '%' || $2 || '%'
       )
     ORDER BY h.english_name ASC
     LIMIT $3 OFFSET $4`,
    [statuses, normalizedQuery, limit, offset]
  );

  const results = rows
    .map((row) => {
      const matchPercentage = nameMatchScore(row, normalizedQuery);
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
          parameter: 'herb_name',
          matched: matchPercentage >= 75,
          score: matchPercentage,
          weight: 100,
          note: 'Matched stored herb name fields in the database',
        }],
      };
    })
    .filter((row) => row.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return {
    results,
    meta: {
      name_search: true,
      matched: results.length > 0,
      query: normalizedQuery,
    },
  };
}
