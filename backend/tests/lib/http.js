export const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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
