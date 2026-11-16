export const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export async function api(method, path, { token, body, rateLimitKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let resolvedRateLimitKey = rateLimitKey;
  if (
    !resolvedRateLimitKey
    && process.env.NODE_ENV === 'test'
    && method === 'POST'
    && (path === '/api/auth/login'
      || path === '/api/auth/password-reset/request'
      || path === '/api/auth/password-reset/confirm'
      || path === '/api/search/simple'
      || path === '/api/explain')
  ) {
    resolvedRateLimitKey = 'integration-default-http';
  }
  if (resolvedRateLimitKey) {
    headers['X-Test-Rate-Limit-Key'] = resolvedRateLimitKey;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.slice(0, 120) };
  }

  return { ok: response.ok, status: response.status, data };
}

export function countFullMatches(results = []) {
  return results.filter((row) => Number(row.matchPercentage) === 100).length;
}
