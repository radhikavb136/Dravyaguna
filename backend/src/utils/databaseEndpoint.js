/**
 * Returns host:port for a PostgreSQL connection string (no credentials).
 */
export function databaseEndpointFromUrl(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl);
    const port = parsed.port || '5432';
    return `${parsed.hostname}:${port}`;
  } catch {
    return null;
  }
}
