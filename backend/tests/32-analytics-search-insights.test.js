import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { buildSearchInsights } from '../src/services/analytics/searchInsightsService.js';

export async function run() {
  const { tokens } = await getTokens();
  const denied = await api('GET', '/api/analytics/search/insights', { token: tokens.clinician });
  assertEqual(denied.status, 403, 'clinicians cannot read search insights');

  const insights = await api('GET', '/api/analytics/search/insights?days=30', { token: tokens.expert });
  assertEqual(insights.status, 200, 'domain expert can read search insights');
  assert(Array.isArray(insights.data.suggestions), 'insights include suggestions array');
  assertEqual(insights.data.auto_apply, undefined, 'response does not expose auto_apply at root');
  for (const item of insights.data.suggestions) {
    assertEqual(item.auto_apply, false, 'each suggestion refuses automatic application');
    assertEqual(item.requires_expert_approval, true, 'each suggestion requires expert approval');
  }
  assert(insights.data.disclaimer?.includes('informational'), 'disclaimer is present');

  const direct = await buildSearchInsights(7);
  assert(direct.days === 7, 'service clamps requested window');
  assert(Array.isArray(direct.aggregates), 'service returns mode aggregates');
}
