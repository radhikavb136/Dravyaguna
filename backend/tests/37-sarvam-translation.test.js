import { assert, assertEqual } from './lib/assert.js';
import {
  createSarvamTranslateFn,
  parseSarvamTranslateResponse,
  SARVAM_HERB_FIELD_LANGUAGES,
  SARVAM_SEARCH_LANGUAGES,
} from '../src/services/translations/sarvamTranslate.js';
import { createTranslationProvider } from '../src/services/translations/translationProvider.js';
import { translateSearchQueryToEnglish } from '../src/services/translations/searchTranslationService.js';

export async function run() {
  assertEqual(parseSarvamTranslateResponse({ translated_text: ' Deepana ' }), 'Deepana', 'parses sarvam body');
  let parseFailed = false;
  try {
    parseSarvamTranslateResponse({});
  } catch {
    parseFailed = true;
  }
  assert(parseFailed, 'empty sarvam response throws');

  assert(SARVAM_SEARCH_LANGUAGES.has('hi-IN') && SARVAM_SEARCH_LANGUAGES.has('mr-IN'), 'search languages');
  assert(!SARVAM_SEARCH_LANGUAGES.has('sa-IN'), 'sanskrit search translation stays unsupported at app layer');
  assert(SARVAM_HERB_FIELD_LANGUAGES.has('sa-IN'), 'sanskrit herb-field target is allowed for provider chain');

  let body = null;
  const translate = createSarvamTranslateFn({
    apiKey: 'sarvam-test-key',
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return {
        ok: true,
        async json() { return { translated_text: 'Digestive stimulant term' }; },
      };
    },
  });
  const result = await translate('दीपन', 'hi-IN', 'en-IN');
  assertEqual(result, 'Digestive stimulant term');
  assertEqual(body.model, 'sarvam-translate:v1');
  assertEqual(body.source_language_code, 'hi-IN');
  assertEqual(body.target_language_code, 'en-IN');
  assertEqual(body.mode, 'formal');

  const provider = createTranslationProvider({
    allowLiveInTest: true,
    sarvamApiKey: 'sarvam-test-key',
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async json() { return {}; },
    }),
  });
  let failed = false;
  try {
    await provider.translate('test', 'hi-IN', 'en-IN');
  } catch (error) {
    failed = /503/.test(error.message);
  }
  assert(failed, 'sarvam HTTP failure propagates');

  const searchProvider = {
    name: 'sarvam',
    async translate(text, source, target) {
      return { text: `EN:${text}`, provider: 'sarvam' };
    },
  };
  const sanskritSearch = await translateSearchQueryToEnglish('दीपन', 'sa-IN', searchProvider);
  assertEqual(sanskritSearch.unavailable, true, 'sanskrit search queries are not translated');
  assertEqual(sanskritSearch.reason, 'unsupported_language');
}
