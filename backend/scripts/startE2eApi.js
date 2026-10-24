/**
 * Start API for Playwright with rate limits disabled (local E2E only).
 */
import dotenv from 'dotenv';

dotenv.config();

process.env.DISABLE_RATE_LIMIT = 'true';
if (!process.env.FRONTEND_ORIGIN?.trim()) {
  process.env.FRONTEND_ORIGIN =
    'http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180';
}

await import('../src/index.js');
