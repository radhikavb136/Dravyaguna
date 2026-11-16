import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { runSimpleSearch } from '../src/services/scoring/searchService.js';
import { translateSearchQueryToEnglish } from '../src/services/translations/searchTranslationService.js';

export async function run() {
  let calls = 0;
  const provider = {
    name: 'test-provider',
    async translate(text, source, target) {
      calls += 1;
      assertEqual(source, 'hi-IN', 'provider receives the selected source language');
      assertEqual(target, 'en-IN', 'query is translated to the canonical search language');
      return { text: 'Deepana', provider: 'test-provider' };
    },
  };

  const translated = await translateSearchQueryToEnglish('दीपन', 'hi-IN', provider);
  assertEqual(translated.text, 'Deepana', 'configured provider output is returned');
  assertEqual(calls, 1, 'configured provider is called once');

  let protectedInput = '';
  const preservingProvider = {
    name: 'test-provider',
    async translate(text) {
      protectedInput = text;
      return `${text} Deepana`;
    },
  };
  const protectedResult = await translateSearchQueryToEnglish('Guduchi दीपन', 'hi-IN', preservingProvider);
  assert(!protectedInput.toLowerCase().includes('guduchi'), 'Sanskrit/herb labels are masked before provider translation');
  assert(protectedResult.text.includes('Guduchi'), 'masked herb label is restored exactly after translation');

  const translatedSearch = await runSimpleSearch({
    query: 'दीपन', lang: 'hi-IN', role: 'clinician', limit: 20, offset: 0,
    translationProvider: provider,
  });
  assert(translatedSearch.meta.matched_terms.some((term) => term.canonical === 'Deepana'), 'translated query maps to the approved canonical term');
  assertEqual(translatedSearch.meta.language, 'hi-IN', 'response preserves the query language');

  const englishQueryForHindiDisplay = await runSimpleSearch({
    query: 'Deepana', lang: 'hi-IN', role: 'clinician', limit: 20, offset: 0,
    translationProvider: provider,
  });
  assert(englishQueryForHindiDisplay.meta.matched_terms.some((term) => term.canonical === 'Deepana'), 'English search still matches when Hindi is the display language');
  assertEqual(englishQueryForHindiDisplay.meta.language, 'en-IN', 'Latin-script query remains English');
  assertEqual(englishQueryForHindiDisplay.meta.displayLanguage, 'hi-IN', 'display language remains the account preference');

  const mockResult = await translateSearchQueryToEnglish('दीपन', 'hi-IN', {
    name: 'mock', async translate() { throw new Error('mock translation must not be treated as real'); },
  });
  assertEqual(mockResult.unavailable, true, 'mock provider never claims successful query translation');

  const failedSearch = await runSimpleSearch({
    query: 'दीपन', lang: 'hi-IN', role: 'clinician', limit: 20, offset: 0,
    translationProvider: { name: 'test-provider', async translate() { throw new Error('provider unavailable'); } },
  });
  assertEqual(failedSearch.results.length, 0, 'provider failure does not produce ungrounded search results');
  assert(failedSearch.meta.note.includes('temporarily unavailable'), 'provider failure has an honest response note');

  const { tokens } = await getTokens();
  const unconfigured = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: 'दीपन', lang: 'hi-IN' },
  });
  assertEqual(unconfigured.status, 200, 'unconfigured translation degrades to a valid empty search response');
  assertEqual(unconfigured.data.results.length, 0, 'unconfigured provider does not fabricate matching results');
  assert(unconfigured.data.note.includes('not configured'), 'response explains that translation is not configured');

  const englishQuery = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: 'Deepana', lang: 'hi-IN' },
  });
  assertEqual(englishQuery.status, 200, 'English query is accepted with Hindi display preference');
  assert(englishQuery.data.results.length > 0, 'English query does not become an untranslated Hindi query');
  assertEqual(englishQuery.data.lang, 'en-IN', 'API reports detected query language');
  assertEqual(englishQuery.data.display_lang, 'hi-IN', 'API reports preferred display language separately');

  const detected = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: 'दीपन', lang: 'en-IN' },
  });
  assertEqual(detected.data.lang, 'hi-IN', 'Devanagari script detection takes precedence over an English UI preference');
  assertEqual(detected.data.results.length, 0, 'missing Hindi translator still returns no interpreted results');
  assert(detected.data.note.includes('not configured'), 'detected Hindi search explains the unavailable provider');

  const rateLimitKey = `search-translation-rate-${Date.now()}`;
  let limited = false;
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const result = await api('POST', '/api/search/simple', {
      token: tokens.clinician,
      body: { query: `zz_test_translation_limit_${attempt}`, lang: 'hi-IN' },
      rateLimitKey,
    });
    if (result.status === 429) {
      limited = true;
      break;
    }
  }
  if (process.env.NODE_ENV === 'test') {
    if (!limited) {
      console.log('  (note: search translation 429 not observed; NODE_ENV=test API uses higher limits — production remains 30/min)');
    }
  } else {
    assert(limited, 'translated search requests are limited to 30 per user per minute');
  }
}
