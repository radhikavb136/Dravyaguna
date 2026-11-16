const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const DEFAULT_TIMEOUT_MS = 20_000;

export function resolveGeminiModel(model) {
  return String(model || '').trim() || DEFAULT_GEMINI_MODEL;
}

export function parseGeminiGenerateContent(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part?.text || '').join('').trim();
}

export function createGeminiProvider({
  apiKey,
  model,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const resolvedModel = resolveGeminiModel(model);
  return {
    name: 'gemini',
    model: resolvedModel,
    async generate({ system, question, retrievedData }) {
      if (!apiKey) throw new Error('Gemini provider requires GEMINI_API_KEY (or LLM_API_KEY)');
      const resolved = resolveGeminiModel(model);
      const userPayload = JSON.stringify({
        question: String(question || '').slice(0, 500),
        retrieved_evidence: retrievedData,
      });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolved)}:generateContent`;
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userPayload }] }],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message || `status ${response.status}`;
        throw new Error(`Gemini request failed: ${message}`);
      }
      const text = parseGeminiGenerateContent(payload);
      if (!text) throw new Error('Gemini response contained no text');
      return text;
    },
  };
}
