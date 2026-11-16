/**
 * In NODE_ENV=test, optional X-Test-Rate-Limit-Key isolates in-memory limiter buckets per test run.
 * Ignored outside test so production limits stay per-client IP.
 */
export function rateLimitClientKey(req) {
  const testKey = req.headers['x-test-rate-limit-key'];
  if (process.env.NODE_ENV === 'test' && testKey) {
    return `test:${String(testKey)}`;
  }
  return req.ip;
}
