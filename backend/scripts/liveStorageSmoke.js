/**
 * Live Supabase Storage smoke (dev only). No secrets logged.
 * Requires running API with NODE_ENV !== test and storage env configured.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { storageEnvValues } from '../src/services/storage/storageConfig.js';

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fileEnv = dotenv.parse(fs.readFileSync(path.join(backendRoot, '.env'), 'utf8'));
const port = fileEnv.PORT || '4000';
const API = `http://127.0.0.1:${port}`;
// Prefer backend/.env over shell (E2E often exports a different DEV_USER_PASSWORD).
const devPassword = fileEnv.DEV_USER_PASSWORD?.trim()
  || process.env.DEV_USER_PASSWORD?.trim()
  || 'Dev1234567';

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

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

function publicObjectPathFromUrl(imageUrl, bucket) {
  const marker = `/object/public/${encodeURIComponent(bucket)}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) {
    const plain = `/object/public/${bucket}/`;
    const i2 = imageUrl.indexOf(plain);
    if (i2 === -1) return null;
    return decodeURIComponent(imageUrl.slice(i2 + plain.length));
  }
  return decodeURIComponent(imageUrl.slice(idx + marker.length));
}

const report = { result: 'FAIL', steps: {} };

try {
  const { supabaseUrl, supabaseServiceRoleKey, supabaseStorageBucket } = storageEnvValues();
  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseStorageBucket) {
    report.error = 'storage_env_incomplete';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const bucketList = await fetch(`${baseUrl}/storage/v1/bucket`, {
    headers: { Authorization: `Bearer ${supabaseServiceRoleKey}`, apikey: supabaseServiceRoleKey },
    signal: AbortSignal.timeout(20_000),
  });
  const buckets = await bucketList.json().catch(() => []);
  const names = Array.isArray(buckets) ? buckets.map((b) => b.name).filter(Boolean) : [];
  const bucketExists = names.includes(supabaseStorageBucket);
  report.steps.bucket_list = {
    ok: bucketList.ok,
    http_status: bucketList.status,
    configured_bucket: supabaseStorageBucket,
    bucket_exists_in_project: bucketExists,
    bucket_count: names.length,
  };
  if (!bucketExists) {
    report.error = 'configured_bucket_not_found_in_project';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const uploadAccounts = ['dev-editor@test.com', 'dev-admin@test.com', 'dev-expert@test.com'];
  let token = null;
  const loginAttempts = {};
  for (const email of uploadAccounts) {
    const attempt = await json('POST', '/api/auth/login', { body: { email, password: devPassword } });
    loginAttempts[email] = attempt.status;
    if (attempt.status === 200 && attempt.data.token) {
      token = attempt.data.token;
      report.steps.login = { ok: true, email_used: email };
      break;
    }
  }
  if (!token) {
    report.steps.login = { ok: false, attempts: loginAttempts };
    report.error = 'dev_upload_role_login_failed_set_DEV_USER_PASSWORD';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const stamp = Date.now();
  const created = await json('POST', '/api/herbs', {
    token,
    body: { code: `zz_live_storage_${stamp}`, english_name: `ZZ Live Storage ${stamp}`, status: 'draft' },
  });
  if (created.status !== 201) {
    report.steps.create_herb = { status: created.status, error: created.data?.error };
    report.error = 'create_test_herb_failed';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  const herbId = created.data.id;

  const uploadRes = await fetch(`${API}/api/upload/herb-image/${herbId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
    body: MIN_PNG,
    signal: AbortSignal.timeout(60_000),
  });
  const uploadBody = await uploadRes.json().catch(() => ({}));
  report.steps.upload = { status: uploadRes.status, has_image_url: Boolean(uploadBody.image_url) };
  if (uploadRes.status !== 201 || !uploadBody.image_url) {
    report.error = uploadBody.error || 'upload_failed';
    report.steps.upload.storage_http = uploadBody;
    const adminForCleanup = await json('POST', '/api/auth/login', {
      body: { email: 'dev-admin@test.com', password: devPassword },
    });
    if (adminForCleanup.status === 200 && adminForCleanup.data.token) {
      await json('DELETE', `/api/herbs/${herbId}`, { token: adminForCleanup.data.token });
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const imageUrl = uploadBody.image_url;
  const imgGet = await fetch(imageUrl, { method: 'GET', signal: AbortSignal.timeout(20_000) });
  report.steps.image_retrieval = { status: imgGet.status, ok: imgGet.ok };

  const objectPath = publicObjectPathFromUrl(imageUrl, supabaseStorageBucket);
  let storageDeleted = false;
  if (objectPath) {
    const del = await fetch(
      `${baseUrl}/storage/v1/object/${encodeURIComponent(supabaseStorageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supabaseServiceRoleKey}`, apikey: supabaseServiceRoleKey },
        signal: AbortSignal.timeout(20_000),
      }
    );
    storageDeleted = del.ok;
    report.steps.storage_cleanup = { status: del.status, ok: storageDeleted };
  }

  const adminLogin = await json('POST', '/api/auth/login', {
    body: { email: 'dev-admin@test.com', password: devPassword },
  });
  if (adminLogin.status === 200 && adminLogin.data.token) {
    const archived = await json('DELETE', `/api/herbs/${herbId}`, { token: adminLogin.data.token });
    report.steps.herb_cleanup = { status: archived.status, ok: archived.status === 200 };
  } else {
    report.steps.herb_cleanup = { skipped: true, reason: 'admin_login_failed' };
  }

  if (!imgGet.ok) {
    report.error = 'image_url_not_retrievable';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.result = 'PASS';
  report.steps.summary = {
    upload_http: 201,
    image_http: imgGet.status,
    bucket_verified: true,
    storage_object_removed: storageDeleted,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
} catch (e) {
  report.error = e.message;
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
