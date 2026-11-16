/**
 * Sponsor-demo API: port 4010 + isolated local Postgres (127.0.0.1:54334).
 * Loads JWT and other secrets from backend/.env, then overrides PORT and DATABASE_URL
 * so `npm run dev` can keep PORT=4000 and its own DATABASE_URL unchanged.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendRoot, '../.env') });

const localDemoDb =
  process.env.SPONSOR_DEMO_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';

process.env.PORT = process.env.SPONSOR_DEMO_PORT || '4010';
process.env.DATABASE_URL = localDemoDb;

if (!process.env.FRONTEND_ORIGIN?.trim()) {
  process.env.FRONTEND_ORIGIN =
    'http://localhost:5180,http://127.0.0.1:5180,http://localhost:5173,http://127.0.0.1:5173';
}

if (process.env.SPONSOR_DEMO_DISABLE_RATE_LIMIT === 'true') {
  process.env.DISABLE_RATE_LIMIT = 'true';
}

await import('../src/index.js');
