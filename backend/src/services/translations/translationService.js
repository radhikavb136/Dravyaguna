import { pool } from '../../db/pool.js';
import { createTranslationProvider } from './translationProvider.js';

const allowedFields = new Set(['description', 'prabhava', 'part_used']);
const inFlight = new Map();

export async function translateHerbFields(herb, targetLanguage, provider = createTranslationProvider()) {
  const fields = {};
  for (const fieldName of allowedFields) {
    const sourceText = herb[fieldName];
    if (!sourceText || targetLanguage === herb.original_language) continue;
    if (sourceText.length > 2000) { fields[fieldName] = { text: sourceText, translation_unavailable: true }; continue; }
    const key = `${herb.id}:${fieldName}:${targetLanguage}`;
    const cached = await pool.query(
      `SELECT translated_text, status, provider FROM translation_cache
       WHERE content_type='herb' AND content_id=$1 AND field_name=$2 AND target_language=$3`,
      [String(herb.id), fieldName, targetLanguage]
    );
    if (cached.rows[0]) {
      fields[fieldName] = { text: cached.rows[0].translated_text, status: cached.rows[0].status, provider: cached.rows[0].provider };
      continue;
    }
    let pending = inFlight.get(key);
    if (!pending) {
      pending = (async () => {
        const result = await provider.translate(sourceText, herb.original_language || 'en-IN', targetLanguage);
        const translatedText = typeof result === 'string' ? result : result.text;
        const providerName = typeof result === 'string' ? provider.name : result.provider;
        await pool.query(
          `INSERT INTO translation_cache (content_type, content_id, field_name, target_language, translated_text, status, provider, source_language)
           VALUES ('herb',$1,$2,$3,$4,'machine_translated',$5,$6)
           ON CONFLICT (content_type, content_id, field_name, target_language) DO UPDATE SET translated_text=EXCLUDED.translated_text, status='machine_translated', provider=EXCLUDED.provider, source_language=EXCLUDED.source_language, cached_at=NOW(), verified_by=NULL, verified_at=NULL`,
          [String(herb.id), fieldName, targetLanguage, translatedText, providerName, herb.original_language || 'en-IN']
        );
        return { text: translatedText, status: 'machine_translated', provider: providerName };
      })().finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    try { fields[fieldName] = await pending; }
    catch { fields[fieldName] = { text: sourceText, translation_unavailable: true }; }
  }
  return fields;
}

export async function verifyTranslation({ contentType, contentId, fieldName, language, userId }) {
  const { rows } = await pool.query(
    `UPDATE translation_cache SET status='verified_translation', verified_by=$5, verified_at=NOW()
     WHERE content_type=$1 AND content_id=$2 AND field_name=$3 AND target_language=$4 RETURNING *`,
    [contentType, String(contentId), fieldName, language, userId]
  );
  return rows[0] || null;
}
