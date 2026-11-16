/**
 * End-to-end API workflow against a running backend (uses backend/.env for DB; no secrets logged).
 * Usage: API must be listening on PORT from .env (default 4000).
 *   node scripts/devApplicationWorkflow.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fileEnv = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const port = fileEnv.PORT || process.env.PORT || '4000';
const API = `http://127.0.0.1:${port}`;
const devPassword = process.env.DEV_USER_PASSWORD || fileEnv.DEV_USER_PASSWORD || 'Dev1234567';
const dbUrl = fileEnv.DATABASE_URL;
if (!dbUrl) {
  console.error(JSON.stringify({ result: 'FAIL', step: 'env', error: 'DATABASE_URL missing in backend/.env' }));
  process.exit(1);
}

const report = { result: 'PASS', api: API, steps: {}, warnings: [] };

async function json(method, urlPath, { token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function fail(step, detail) {
  report.result = 'FAIL';
  report.failed_step = step;
  report.error = detail;
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

try {
  const health = await json('GET', '/api/health');
  if (health.status !== 200 || health.data.database !== 'ok') {
    fail('health', `HTTP ${health.status} database=${health.data.database}`);
  }
  report.steps.health = {
    ok: true,
    databaseEndpoint: health.data.databaseEndpoint,
    llmConfigured: health.data.llmConfigured,
    storageConfigured: health.data.storageConfigured,
    smtpConfigured: health.data.smtpConfigured,
    storageMissingEnv: health.data.storageMissingEnv,
    smtpMissingEnv: health.data.smtpMissingEnv,
  };

  const stamp = Date.now();
  const email = `zz_workflow_${stamp}@example.com`;
  const password = 'WorkflowTestPass12';
  const reg = await json('POST', '/api/auth/register', {
    body: { email, password, fullName: 'ZZ Workflow User' },
  });
  if (reg.status !== 201) fail('register', `HTTP ${reg.status} ${reg.data.error || ''}`);
  const login = await json('POST', '/api/auth/login', { body: { email, password } });
  if (login.status !== 200 || !login.data.token) fail('login_new_user', `HTTP ${login.status}`);
  const pool = new pg.Pool({ connectionString: dbUrl, max: 1 });
  const { rows: [row] } = await pool.query(
    'SELECT id, status::text AS status FROM users WHERE email=$1',
    [email.toLowerCase()],
  );
  if (!row) fail('db_persistence', 'registered user not in database');
  report.steps.register_persist = { ok: true, status: row.status };

  const me = await json('GET', '/api/account', { token: login.data.token });
  report.steps.session_account = {
    status: me.status,
    ok: me.status === 200,
    has_email: Boolean(me.data?.data?.email),
  };

  const roles = {};
  for (const [key, account] of Object.entries({
    admin: 'dev-admin@test.com',
    editor: 'dev-editor@test.com',
    expert: 'dev-expert@test.com',
    clinician: 'dev-clinician@test.com',
  })) {
    const r = await json('POST', '/api/auth/login', { body: { email: account, password: devPassword } });
    if (r.status !== 200) fail(`login_${key}`, `HTTP ${r.status}`);
    roles[key] = r.data.token;
  }
  report.steps.dev_logins = { ok: true };

  const simple = await json('POST', '/api/search/simple', {
    token: roles.clinician,
    body: { query: 'Deepana', limit: 5 },
  });
  if (simple.status !== 200) fail('simple_search', `HTTP ${simple.status}`);
  const herbId = simple.data?.results?.[0]?.id;
  report.steps.simple_search = {
    ok: true,
    result_count: (simple.data?.results || []).length,
    first_herb_id: herbId ? 'present' : 'none',
  };

  const detailed = await json('POST', '/api/search/detailed', {
    token: roles.clinician,
    body: { filters: { rasa: ['Tikta'], karma: ['Deepana'] }, limit: 200 },
  });
  const perfect = (detailed.data?.results || []).filter((h) => h.matchPercentage === 100).length;
  report.steps.detailed_search = { ok: detailed.status === 200, perfect_100_count: perfect };

  const hi = await json('POST', '/api/search/simple', {
    token: roles.clinician,
    body: { query: 'दीपन', limit: 3, lang: 'hi-IN' },
  });
  report.steps.translation_search_hi = {
    ok: hi.status === 200,
    result_count: (hi.data?.results || []).length,
    note: hi.status === 200 ? 'hi-IN query accepted' : hi.data?.error,
  };

  if (herbId) {
    const herb = await json('GET', `/api/herbs/${herbId}`, { token: roles.clinician });
    report.steps.herb_detail = { ok: herb.status === 200, status: herb.status };

    const explain = await json('POST', '/api/explain', {
      token: roles.clinician,
      body: { herb_id: herbId, lang: 'en-IN' },
    });
    const evidenceCount = (explain.data?.evidence || []).length;
    report.steps.explain = {
      ok: explain.status === 200,
      status: explain.status,
      answer_status: explain.data?.answer_status,
      provider: explain.data?.provider,
      ai_generated: explain.data?.ai_generated,
      evidence_count: evidenceCount,
      grounded: evidenceCount > 0 && Boolean(explain.data?.explanation),
    };
    if (explain.status !== 200) report.warnings.push('explain_non_200');
  } else {
    report.warnings.push('skipped_herb_detail_explain_no_search_results');
  }

  const favAdd = await json('POST', '/api/favorites', {
    token: roles.clinician,
    body: herbId ? { herb_id: herbId } : { herb_id: '00000000-0000-4000-8000-000000000001' },
  });
  const favList = await json('GET', '/api/favorites', { token: roles.clinician });
  report.steps.favorites = {
    add_status: favAdd.status,
    list_status: favList.status,
    count: (favList.data?.data || favList.data || []).length,
  };

  const denied = await json('GET', '/api/users', { token: roles.clinician });
  report.steps.rbac_clinician_users = { status: denied.status, expect_403: denied.status === 403 };

  const insights = await json('GET', '/api/analytics/search/insights', { token: roles.expert });
  report.steps.analytics_insights = { status: insights.status, ok: insights.status === 200 };

  const exportRes = await fetch(`${API}/api/admin/export?format=csv`, {
    headers: { Authorization: `Bearer ${roles.admin}`, Accept: 'text/csv' },
    signal: AbortSignal.timeout(60_000),
  });
  report.steps.admin_export_csv = { status: exportRes.status, ok: exportRes.status === 200 };

  const resetReq = await json('POST', '/api/auth/password-reset/request', {
    body: { email: 'dev-clinician@test.com' },
  });
  report.steps.password_reset_request = {
    status: resetReq.status,
    ok: resetReq.status === 202 || resetReq.status === 200,
    smtpConfigured: health.data.smtpConfigured,
  };

  await pool.query('DELETE FROM users WHERE email=$1', [email.toLowerCase()]);
  await pool.end();
  report.steps.cleanup_workflow_user = { ok: true };

  if (!report.steps.rbac_clinician_users.expect_403) {
    report.result = 'FAIL';
    report.failed_step = 'rbac';
  }
  if (simple.data?.results?.length === 0) {
    report.warnings.push('simple_search_zero_results');
  }
} catch (error) {
  fail('exception', error.message);
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.result === 'PASS' ? 0 : 1);
