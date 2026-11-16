import { assert, assertEqual } from './lib/assert.js';
import { getTestPool } from './lib/testPool.js';
import { generateExplanation } from '../src/services/explain/explainService.js';
import { createGeminiProvider } from '../src/services/explain/geminiProvider.js';

const pool = getTestPool();

export async function run() {
  const { rows: [fixture] } = await pool.query(
    `SELECT id FROM herbs WHERE status IN ('reviewed', 'verified') ORDER BY code LIMIT 1`
  );
  assert(fixture, 'requires a reviewed herb');

  const rejectingProvider = createGeminiProvider({
    apiKey: 'fixture-key',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { candidates: [{ content: { parts: [{ text: 'Take 2 doses of 500 mg every day.' }] } }] };
      },
    }),
  });

  const fallback = await generateExplanation(
    { herbId: fixture.id, filters: { prabhava: [`zz_gemini_fallback_${Date.now()}`] }, lang: 'en-IN', role: 'clinician' },
    { provider: rejectingProvider }
  );
  assert(
    fallback.answer_status === 'database_template' || fallback.explanation_unavailable === true,
    'rejected gemini output falls back safely'
  );
  assertEqual(fallback.ai_generated, false, 'fallback is not labelled as live AI');

  const malformedProvider = createGeminiProvider({
    apiKey: 'fixture-key',
    fetchImpl: async () => ({
      ok: true,
      async json() { return { candidates: [] }; },
    }),
  });
  const malformed = await generateExplanation(
    { herbId: fixture.id, filters: { prabhava: [`zz_gemini_malformed_${Date.now()}`] }, lang: 'en-IN', role: 'clinician' },
    { provider: malformedProvider }
  );
  assert(
    malformed.answer_status === 'database_template' || malformed.explanation_unavailable === true,
    'malformed gemini response falls back'
  );

}
