export function assertTestDatabaseAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('npm test refuses to run when NODE_ENV=production');
  }
  const databaseUrl = process.env.DATABASE_URL || '';
  const prodRef = process.env.PROD_DB_REF || '';
  if (prodRef && databaseUrl.includes(prodRef)) {
    throw new Error('npm test refuses to run against the production database (PROD_DB_REF matched DATABASE_URL)');
  }

  if (databaseUrl.includes('pooler.supabase.com')) {
    const devRef = process.env.DEV_DB_REF || '';
    let databaseProjectRef = '';
    try {
      const parsedUrl = new URL(databaseUrl);
      const match = decodeURIComponent(parsedUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
      databaseProjectRef = match ? match[1] : '';
    } catch {
      databaseProjectRef = '';
    }
    if (!devRef || databaseProjectRef !== devRef) {
      throw new Error('npm test requires DEV_DB_REF to exactly match the Supabase development project');
    }
  }
}
