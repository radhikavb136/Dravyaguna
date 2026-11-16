import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { withE2ePool } from './db.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend');

function loadBackendEnvIfNeeded() {
  if (process.env.JWT_SECRET) {
    return;
  }
  const envPath = path.join(backendRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function ensureDatabaseUrl() {
  const url =
    process.env.E2E_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna';
  process.env.DATABASE_URL = url;
  return url;
}

export async function mintPasswordResetToken(email) {
  ensureDatabaseUrl();
  loadBackendEnvIfNeeded();
  const mod = await import(
    pathToFileURL(path.join(backendRoot, 'src/services/auth/passwordResetService.js')).href
  );
  let rawToken = '';
  await mod.requestPasswordReset(email, {
    deliver: async ({ token }) => {
      rawToken = token;
    },
  });
  if (!rawToken || rawToken.length < 32) {
    throw new Error('Failed to mint password reset token for E2E');
  }
  return rawToken;
}

export async function expirePasswordResetToken(rawToken) {
  const hash = createHash('sha256').update(rawToken).digest('hex');
  return withE2ePool(async (pool) => {
    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE token_hash = $1 AND used_at IS NULL`,
      [hash]
    );
  });
}
