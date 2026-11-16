import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

export async function run() {
  const { tokens } = await getTokens();
  const pool = getTestPool();

  // 1. GET /api/model/status requires authentication
  const unauth = await api('GET', '/api/model/status');
  assertEqual(unauth.status, 401, 'GET /api/model/status requires authentication');

  // 2. GET /api/model/status returns model status for authenticated user
  const statusRes = await api('GET', '/api/model/status', { token: tokens.admin });
  assertEqual(statusRes.status, 200, 'GET /api/model/status returns 200 for authenticated user');
  assert(statusRes.data.config, 'model status contains config');
  assert(statusRes.data.metrics, 'model status contains metrics');

  // 3. PUT /api/model/config rejects non-admin users
  const forbiddenConfig = await api('PUT', '/api/model/config', {
    token: tokens.clinician,
    body: { sensitivity: 'low' },
  });
  assertEqual(forbiddenConfig.status, 403, 'PUT /api/model/config rejects non-admin users');

  // 4. POST /api/model/train allows admin to run learning cycle
  const trainRes = await api('POST', '/api/model/train', {
    token: tokens.admin,
  });
  assertEqual(trainRes.status, 200, 'POST /api/model/train allows admin to run learning cycle');
  assertEqual(trainRes.data.success, true, 'train response success is true');

  // 5. POST /api/model/feedback allows clinicians to log feedback
  const { rows: herbs } = await pool.query('SELECT id FROM herbs LIMIT 1');
  const herbId = herbs[0]?.id;
  if (herbId) {
    const feedbackRes = await api('POST', '/api/model/feedback', {
      token: tokens.clinician,
      body: {
        queryText: 'pitta balance',
        herbId,
        interactionType: 'click',
      },
    });
    assertEqual(feedbackRes.status, 201, 'POST /api/model/feedback allows clinician to log feedback');
    assertEqual(feedbackRes.data.success, true, 'feedback response success is true');

    // Clean up test interaction
    await pool.query('DELETE FROM model_interactions WHERE query_text = $1', ['pitta balance']);
  }
}
