import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.EMBEDDED_PG_DATA_DIR
  ? path.resolve(process.env.EMBEDDED_PG_DATA_DIR)
  : path.join(__dirname, '../.embedded-pg');
const port = Number(process.env.EMBEDDED_PG_PORT || 54329);

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  // Reuse an existing local cluster. Re-running this script must never try to
  // initialize over project data that is already in the directory.
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();

  const dbName = 'dravyaguna';
  const client = pg.getPgClient();
  await client.connect();
  const { rows } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );
  await client.end();
  if (!rows.length) await pg.createDatabase(dbName);

  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/${dbName}`;
  console.log(url);
  console.error(`Embedded PostgreSQL listening on 127.0.0.1:${port} (pid ${process.pid})`);
  console.error('Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
