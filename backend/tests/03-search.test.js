import { assert, assertEqual } from './lib/assert.js';
import { api, countFullMatches } from './lib/http.js';
import { getTokens } from './lib/session.js';

async function search(token, filters) {
  return api('POST', '/api/search/detailed', {
    token,
    body: { filters, limit: 200 },
  });
}

export async function run() {
  const { tokens } = await getTokens();

  const tiktaDeepanaClinician = await search(tokens.clinician, {
    rasa: ['tikta'],
    karma: ['deepana'],
  });
  assert(tiktaDeepanaClinician.ok, 'tikta+deepana clinician search');
  const tdResults = tiktaDeepanaClinician.data.results || [];
  assert(tdResults.length > 0, 'Tikta+Deepana returns clinician results');
  assert(countFullMatches(tdResults) > 0, 'Tikta+Deepana has full matches');
  assert(tdResults[0]?.englishName, 'search results use englishName');
  assert(typeof tdResults[0]?.matchPercentage === 'number', 'matchPercentage present');

  const tiktaDeepanaEditor = await search(tokens.editor, {
    rasa: ['tikta'],
    karma: ['deepana'],
  });
  const tdEditor = tiktaDeepanaEditor.data.results || [];
  assert(tdEditor.length >= tdResults.length, 'editors can see clinician search results');
  assert(countFullMatches(tdEditor) >= countFullMatches(tdResults), 'editor full matches include clinician matches');

  const tiktaUshna = await search(tokens.clinician, {
    rasa: ['tikta'],
    virya: ['ushna'],
  });
  const tu = tiktaUshna.data.results || [];
  assert(tu.length > 0, 'Tikta+Ushna returns results');
  assert(countFullMatches(tu) > 0, 'Tikta+Ushna has full matches');
  const ratio = (row, group) => {
    const item = (row.breakdown || []).find((part) => part.group === group);
    return Number(item?.ratio);
  };
  const tiktaOnly = tu.filter((row) => ratio(row, 'rasa') === 1 && ratio(row, 'virya') === 0);
  const ushnaOnly = tu.filter((row) => ratio(row, 'rasa') === 0 && ratio(row, 'virya') === 1);
  assert(tiktaOnly.length > 0, 'Tikta-only partials are retained');
  assert(ushnaOnly.length > 0, 'Ushna-only partials are retained');

  const ushnaClinician = await search(tokens.clinician, { virya: ['ushna'] });
  assert((ushnaClinician.data.results || []).length > 0, 'Virya Ushna clinician results');
  const ushnaEditor = await search(tokens.editor, { virya: ['ushna'] });
  assert(ushnaEditor.data.results.length >= ushnaClinician.data.results.length, 'editor Virya results include clinician results');

  const simpleWithFilter = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { query: 'fever', filters: { rasa: ['tikta'] }, limit: 200 },
  });
  assert(simpleWithFilter.ok, 'simple search combines text and clinical filters');
  assert((simpleWithFilter.data.results || []).length > 0, 'simple search with filters returns herbs');
  assert(
    (simpleWithFilter.data.results[0].breakdown || []).some((item) => item.group === 'rasa'),
    'simple search response includes the clinical-filter scoring breakdown'
  );

  const filterOnly = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { filters: { rasa: ['tikta'] }, limit: 200 },
  });
  assert(filterOnly.ok, 'simple search accepts filter-only requests');
  assert((filterOnly.data.results || []).length > 0, 'filter-only search returns herbs');

  const emptySimple = await api('POST', '/api/search/simple', {
    token: tokens.clinician,
    body: { filters: {} },
  });
  assertEqual(emptySimple.status, 400, 'simple search requires query or at least one filter');

  const vataClinician = await search(tokens.clinician, {
    dosha: [{ dosha: 'vata', effect: 'pacifies' }],
  });
  assert((vataClinician.data.results || []).length > 0, 'Dosha Vata pacifies clinician results');
  const vataEditor = await search(tokens.editor, {
    dosha: [{ dosha: 'vata', effect: 'pacifies' }],
  });
  assert(vataEditor.data.results.length >= vataClinician.data.results.length, 'editor Dosha results include clinician results');

  const filters = await api('GET', '/api/vocabulary/filters', { token: tokens.clinician });
  assert(filters.ok, 'filters');
  assert(filters.data.rasa[0]?.slug, 'filter slug');
  assert(filters.data.rasa[0]?.label, 'filter label');
  assertEqual(filters.data.hasOrganData, false, 'organ data flag');
}
