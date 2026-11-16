import { env } from '../../config/env.js';
import { createSarvamTranslateFn } from './sarvamTranslate.js';

export function createMockTranslationProvider() {
  return {
    name: 'mock',
    async translate(text, source, target) {
      return `[${target} mock translation] ${text}`;
    },
  };
}

async function translateGoogle(text, source, target) {
  const url = new URL('https://translation.googleapis.com/language/translate/v2');
  url.searchParams.set('key', env.googleTranslateApiKey);
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: source.slice(0, 2), target: target.slice(0, 2), format: 'text' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Google translation failed (${response.status})`);
  const data = await response.json();
  const translated = data.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error('Google returned no translated text');
  return translated;
}

async function translateAzure(text, source, target) {
  const url = new URL('https://api.cognitive.microsofttranslator.com/translate');
  url.searchParams.set('api-version', '3.0');
  url.searchParams.set('from', source.slice(0, 2));
  url.searchParams.set('to', target.slice(0, 2));
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': env.azureTranslatorKey, 'Ocp-Apim-Subscription-Region': env.azureTranslatorRegion, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ text }]), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Azure translation failed (${response.status})`);
  const data = await response.json();
  const translated = data[0]?.translations?.[0]?.text;
  if (!translated) throw new Error('Azure returned no translated text');
  return translated;
}

export function createTranslationProvider(options = {}) {
  // Automated tests must not make billable provider requests, even if developer
  // credentials happen to be present in the process environment.
  if (env.nodeEnv === 'test' && !options.allowLiveInTest) return createMockTranslationProvider();

  const sarvamKey = options.sarvamApiKey ?? env.sarvamApiKey;
  const providers = [];
  if (sarvamKey) providers.push(['sarvam', createSarvamTranslateFn({ apiKey: sarvamKey, fetchImpl: options.fetchImpl })]);
  if (env.googleTranslateApiKey) providers.push(['google', translateGoogle]);
  if (env.azureTranslatorKey && env.azureTranslatorRegion) providers.push(['azure', translateAzure]);
  if (!providers.length) return createMockTranslationProvider();
  return {
    name: providers.map(([name]) => name).join('-fallback-'),
    async translate(text, source, target) {
      let lastError;
      for (const [name, translate] of providers) {
        try { return { text: await translate(text, source, target), provider: name }; }
        catch (error) { lastError = error; }
      }
      throw lastError;
    },
  };
}
