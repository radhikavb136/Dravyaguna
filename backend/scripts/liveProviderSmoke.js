/**
 * Optional live provider smoke (no secrets logged).
 * RUN_LIVE_PROVIDER_SMOKE=1 node scripts/liveProviderSmoke.js
 */
import dotenv from 'dotenv';
import { createGeminiProvider } from '../src/services/explain/geminiProvider.js';
import { createSarvamTranslateFn } from '../src/services/translations/sarvamTranslate.js';

dotenv.config();

function sanitizeError(error) {
  const raw = String(error?.message || error || 'unknown').slice(0, 120);
  return raw.replace(/[A-Za-z0-9_\-]{24,}/g, '[redacted]').replace(/\s+/g, ' ').trim();
}

function effectiveLlmProvider() {
  if (process.env.LLM_PROVIDER?.trim()) return process.env.LLM_PROVIDER.trim();
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  return 'mock';
}

const report = { gemini: 'skipped', sarvam: 'skipped' };

async function tryGemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  const providerName = effectiveLlmProvider();
  if (!apiKey) {
    report.gemini = 'skipped_not_configured';
    return;
  }
  if (providerName !== 'gemini') {
    report.gemini = 'skipped_wrong_provider';
    return;
  }
  const provider = createGeminiProvider({
    apiKey,
    model: process.env.LLM_MODEL,
  });
  const text = await provider.generate({
    system: 'Reply with one short educational sentence. No dosages.',
    question: 'ping',
    retrievedData: { evidence: [{ content: 'connectivity test only' }] },
  });
  report.gemini = text && text.length > 10 ? 'ok' : 'empty_response';
}

async function trySarvam() {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    report.sarvam = 'skipped_not_configured';
    return;
  }
  const translate = createSarvamTranslateFn({ apiKey });
  const text = await translate('नमस्ते', 'hi-IN', 'en-IN');
  report.sarvam = text && text.length > 0 ? 'ok' : 'empty_response';
}

async function main() {
  if (process.env.RUN_LIVE_PROVIDER_SMOKE !== '1') {
    console.log(JSON.stringify({ live_smoke: 'skipped', hint: 'Set RUN_LIVE_PROVIDER_SMOKE=1 to run' }));
    return;
  }
  try {
    await tryGemini();
  } catch (error) {
    report.gemini = `error:${sanitizeError(error)}`;
  }
  try {
    await trySarvam();
  } catch (error) {
    report.sarvam = `error:${sanitizeError(error)}`;
  }
  console.log(JSON.stringify({ live_smoke: report, llm_provider: effectiveLlmProvider() }));
}

main().catch(() => {
  console.log(JSON.stringify({ live_smoke: 'fatal_error' }));
  process.exit(1);
});
