import { pool } from '../../db/pool.js';

/**
 * Everyday English symptom words mapped to substrings of canonical vocabulary labels
 * already stored in the database (not invented clinical claims).
 */
export const ENGLISH_VOCABULARY_HINTS = {
  cough: { indication: ['kasa', 'swasa', 'shwasa'] },
  cold: { indication: ['pratishyaya', 'jwara'] },
  fever: { indication: ['jwara', 'daha'] },
  digestive: { karma: ['deepana', 'pachana'], indication: ['ajirna', 'agnimandya', 'amasaya'] },
  digestion: { karma: ['deepana', 'pachana'], indication: ['ajirna', 'agnimandya'] },
  stomach: { indication: ['amasaya', 'udara', 'ajirna', 'adhmana'] },
  abdominal: { indication: ['udara', 'adhmana', 'shula'] },
  pain: { indication: ['shula', 'ruja', 'vedana', 'adhmana'] },
  insomnia: { indication: ['nidra', 'anidra', 'insomnia'] },
  sleep: { indication: ['nidra', 'anidra'] },
  anxiety: { indication: ['chittodvega', 'manasa'] },
  skin: { indication: ['kushtha', 'twak'] },
  diabetes: { indication: ['prameha', 'madhumeha'] },
};

export async function expandTokensWithVocabularyHints(tokens) {
  const karmaIds = new Set();
  const indicationIds = new Set();
  const matchedTerms = [];

  for (const token of tokens) {
    const hint = ENGLISH_VOCABULARY_HINTS[token];
    if (!hint) continue;

    if (hint.karma?.length) {
      const { rows } = await pool.query(
        `SELECT id, canonical_en FROM karma_terms
         WHERE ${hint.karma.map((_, i) => `lower(canonical_en) LIKE $${i + 1}`).join(' OR ')}`,
        hint.karma.map((frag) => `%${frag}%`)
      );
      for (const row of rows) {
        karmaIds.add(row.id);
        matchedTerms.push({
          term: token,
          canonical: row.canonical_en,
          vocabulary: 'karma',
          similarity: 1,
          matchType: 'english_symptom_hint',
        });
      }
    }

    if (hint.indication?.length) {
      const { rows } = await pool.query(
        `SELECT id, canonical_en FROM indication_terms
         WHERE ${hint.indication.map((_, i) => `lower(canonical_en) LIKE $${i + 1}`).join(' OR ')}`,
        hint.indication.map((frag) => `%${frag}%`)
      );
      for (const row of rows) {
        indicationIds.add(row.id);
        matchedTerms.push({
          term: token,
          canonical: row.canonical_en,
          vocabulary: 'indication',
          similarity: 1,
          matchType: 'english_symptom_hint',
        });
      }
    }
  }

  return {
    karmaIds: [...karmaIds],
    indicationIds: [...indicationIds],
    matchedTerms,
  };
}
