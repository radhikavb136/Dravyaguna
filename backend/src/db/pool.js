import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.pgPoolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', (client) => {
  client.on('error', (err) => {
    // Suppress unhandled error crash when cloud pooler resets idle socket
    console.error('PostgreSQL client socket error (handled):', err.message);
  });
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
  // Don't crash the process on pool errors; let queries handle failures
});
