import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();

const host = env.nodeEnv === 'development' ? '::' : '0.0.0.0';
const server = app.listen({ port: env.port, host, ipv6Only: false }, () => {
  console.log(`Dravyaguna API listening on port ${env.port}`);
});

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use. Stop its owner or choose another PORT.`);
  } else {
    console.error(`Backend could not listen on port ${env.port} (${error.code || 'unknown error'}).`);
  }
  await pool.end().catch(() => {});
  process.exitCode = 1;
});

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ETIMEDOUT' || err.message?.includes('ECONNRESET')) {
    console.error('Transient database/network socket reset handled:', err.message);
    return;
  }
  console.error('Uncaught exception in backend server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in backend server:', reason);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
