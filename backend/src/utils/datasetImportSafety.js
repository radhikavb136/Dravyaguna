const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function assertDatasetImportTarget({ databaseUrl, nodeEnv, allowRemoteImport }) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for dataset import');
  let hostname;
  try {
    hostname = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL is invalid');
  }

  const localTarget = LOOPBACK_HOSTS.has(hostname);
  if (!localTarget && allowRemoteImport !== 'YES') {
    throw new Error('Dataset import to a remote database requires ALLOW_REMOTE_DATA_IMPORT=YES after independently confirming the target project');
  }
  if (nodeEnv === 'production' && allowRemoteImport !== 'YES') {
    throw new Error('Dataset import in production requires ALLOW_REMOTE_DATA_IMPORT=YES and deliberate target confirmation');
  }
}
