/**
 * Start API for Playwright and integration tests (local isolated DB only).
 * Forces NODE_ENV=test so HTTP handlers match backend test contracts (mock LLM,
 * no live translation, upload/storage guards) without editing .env secrets.
 */
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
if (!process.env.FRONTEND_ORIGIN?.trim()) {
  process.env.FRONTEND_ORIGIN =
    'http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180';
}

await import('../src/index.js');
