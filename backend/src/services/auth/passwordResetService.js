import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../../db/pool.js';

const SALT_ROUNDS = 12;
const digest = (token) => createHash('sha256').update(token).digest('hex');

// Email adapter stub. It never logs or returns tokens; SMTP delivery remains an infrastructure dependency.
async function sendResetEmailStub(_message) { return false; }

export async function requestPasswordReset(email, { deliver = sendResetEmailStub } = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await pool.query("SELECT id, email FROM users WHERE email=$1 AND status='active'", [normalizedEmail]);
  if (!rows[0]) return;
  const user = rows[0];
  const token = randomBytes(32).toString('base64url');
  const tokenHash = digest(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await client.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at) VALUES ($1,$2,NOW()+INTERVAL '30 minutes',NULL)", [user.id, tokenHash]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  try { await deliver({ email: user.email, token, expiresInMinutes: 30 }); } catch { /* Keep public response generic. */ }
}

export async function confirmPasswordReset(token, password) {
  const tokenHash = digest(token);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [tokenHash]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return false; }
    await client.query('UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1', [rows[0].user_id, passwordHash]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [rows[0].user_id]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
