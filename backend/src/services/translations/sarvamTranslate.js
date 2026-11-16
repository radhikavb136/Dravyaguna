export const SARVAM_TRANSLATE_MODEL = 'sarvam-translate:v1';
export const SARVAM_SEARCH_LANGUAGES = new Set(['hi-IN', 'mr-IN']);
export const SARVAM_HERB_FIELD_LANGUAGES = new Set(['hi-IN', 'mr-IN', 'sa-IN']);

export function sarvamModelForPair(source, target) {
  if (source === 'sa-IN' || target === 'sa-IN') return SARVAM_TRANSLATE_MODEL;
  return SARVAM_TRANSLATE_MODEL;
}

export function parseSarvamTranslateResponse(data) {
  const text = data?.translated_text;
  if (!text || !String(text).trim()) throw new Error('Sarvam returned no translated text');
  return String(text).trim();
}

export function createSarvamTranslateFn({ apiKey, fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  return async function translateSarvam(text, source, target) {
    if (!apiKey) throw new Error('Sarvam requires SARVAM_API_KEY');
    const response = await fetchImpl('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: source,
        target_language_code: target,
        model: sarvamModelForPair(source, target),
        mode: 'formal',
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Sarvam translation failed (${response.status})`);
    const data = await response.json();
    return parseSarvamTranslateResponse(data);
  };
}
