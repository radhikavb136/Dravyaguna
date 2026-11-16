import { assert, assertEqual } from './lib/assert.js';
import { createGeminiProvider, parseGeminiGenerateContent, resolveGeminiModel } from '../src/services/explain/geminiProvider.js';
import { isLiveLlmConfigured, resolveConfiguredLlmProviderName } from '../src/services/explain/llmProvider.js';
import { validateGeneratedExplanation } from '../src/services/explain/explainGroundingValidation.js';
export async function run() {
  assertEqual(resolveConfiguredLlmProviderName(), 'mock', 'test env uses mock llm provider name');
  assertEqual(isLiveLlmConfigured(), false, 'test env does not claim live llm is configured');
  assertEqual(resolveGeminiModel(''), 'gemini-3.6-flash', 'default gemini model');
  assertEqual(
    parseGeminiGenerateContent({ candidates: [{ content: { parts: [{ text: 'Hello grounded.' }] } }] }),
    'Hello grounded.',
    'parses generateContent text'
  );
  assertEqual(parseGeminiGenerateContent({ candidates: [] }), '', 'empty candidates');

  let capturedUrl = '';
  let capturedHeaders = {};
  const provider = createGeminiProvider({
    apiKey: 'test-key-not-real',
    model: 'gemini-3.6-flash',
    fetchImpl: async (url, init) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      return {
        ok: true,
        async json() {
          return { candidates: [{ content: { parts: [{ text: 'This summary is grounded only in the supplied evidence passages for educational use.' }] } }] };
        },
      };
    },
  });
  const text = await provider.generate({
    system: 'No dosages.',
    question: 'What karma?',
    retrievedData: { evidence: [{ content: 'Deepana' }] },
  });
  assert(text.includes('grounded'), 'provider returns model text');
  assert(capturedUrl.includes('gemini-3.6-flash'), 'model in endpoint path');
  assert(!capturedUrl.includes('test-key'), 'api key is not placed in URL');
  assertEqual(capturedHeaders['x-goog-api-key'], 'test-key-not-real', 'api key sent via header');

  const badProvider = createGeminiProvider({
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          candidates: [{
            content: {
              parts: [{ text: 'For this herb you should take 500 mg every morning with food for best clinical results.' }],
            },
          }],
        };
      },
    }),
  });
  const badText = await badProvider.generate({ system: 'x', question: 'y', retrievedData: {} });
  const validation = validateGeneratedExplanation(badText);
  assertEqual(validation.ok, false, 'dosage-like output fails validation');
  assertEqual(validation.reason, 'unsupported_clinical_claim');

  const errorProvider = createGeminiProvider({
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: false, status: 503, async json() { return { error: { message: 'unavailable' } }; } }),
  });
  let httpError = false;
  try {
    await errorProvider.generate({ system: 'x', question: 'y', retrievedData: {} });
  } catch (error) {
    httpError = /503|failed/i.test(String(error.message));
  }
  assert(httpError, 'provider surfaces HTTP failures');

  let missingKey = false;
  try {
    await createGeminiProvider({ apiKey: '' }).generate({ system: 'x', question: 'y', retrievedData: {} });
  } catch (error) {
    missingKey = /GEMINI_API_KEY|LLM_API_KEY/i.test(error.message);
  }
  assert(missingKey, 'gemini without api key fails safely');
}
