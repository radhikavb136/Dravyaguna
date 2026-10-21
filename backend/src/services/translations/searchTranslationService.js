import { pool } from '../../db/pool.js';
import { createTranslationProvider } from './translationProvider.js';

const CANONICAL_TABLES = [
  'rasa_terms', 'guna_terms', 'virya_terms', 'vipaka_terms', 'karma_terms',
  'indication_terms', 'dhatu_terms', 'mala_terms', 'srotas_terms', 'avayava_terms',
];

export async function translateSearchQueryToEnglish(query, sourceLanguage, provider = createTranslationProvider()) {
  if (!['hi-IN', 'mr-IN'].includes(sourceLanguage)) {
    return { text: null, unavailable: true, reason: 'unsupported_language' };
  }
  if (typeof query !== 'string' || query.length > 500) {
    return { text: null, unavailable: true, reason: 'invalid_query' };
  }
  if (!provider || provider.name === 'mock') {
    return { text: null, unavailable: true, reason: 'provider_not_configured' };
  }

  const protectedTerms = await loadProtectedTerms();
  const { maskedText, placeholders } = maskProtectedTerms(query, protectedTerms);
  if (!maskedText.trim()) return { text: '', unavailable: false, provider: provider.name };
  const response = await provider.translate(maskedText, sourceLanguage, 'en-IN');
  const translated = String(typeof response === 'string' ? response : response?.text || '').trim();
  if (!translated) throw new Error('Translation provider returned empty search text');
  let restored = translated;
  for (const [placeholder, original] of placeholders) {
    if (!restored.includes(placeholder)) throw new Error('Translation provider altered a protected classical term');
    restored = restored.replaceAll(placeholder, original);
  }
  return { text: restored, unavailable: false, provider: response?.provider || provider.name };
}

async function loadProtectedTerms() {
  const vocabularyQueries = CANONICAL_TABLES.map((table) => `SELECT canonical_en AS term FROM ${table}`);
  const { rows } = await pool.query([
    ...vocabularyQueries,
    "SELECT DISTINCT name AS term FROM herb_regional_names WHERE name IS NOT NULL AND name <> ''",
    "SELECT sanskrit_name AS term FROM herbs WHERE sanskrit_name IS NOT NULL AND sanskrit_name <> ''",
    "SELECT botanical_name AS term FROM herbs WHERE botanical_name IS NOT NULL AND botanical_name <> ''",
  ].join(' UNION ALL '));
  return [...new Set(rows.map(({ term }) => String(term).trim()).filter((term) => term.length > 1))]
    .sort((left, right) => right.length - left.length);
}

function maskProtectedTerms(query, terms) {
  let maskedText = query;
  const placeholders = [];
  for (const term of terms) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'giu');
    if (!pattern.test(maskedText)) continue;
    pattern.lastIndex = 0;
    const placeholder = `DGTERMPLACEHOLDER${placeholders.length}X`;
    maskedText = maskedText.replace(pattern, placeholder);
    placeholders.push([placeholder, term]);
  }
  return { maskedText, placeholders };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
