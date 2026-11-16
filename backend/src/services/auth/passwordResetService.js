import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { createDefaultPasswordResetDeliverer, isSmtpConfigured } from './emailDeliveryService.js';
import { getSupabaseAdmin } from './supabaseAuthService.js';

const SALT_ROUNDS = 12;
const digest = (token) => createHash('sha256').update(token).digest('hex');

async function sendResetEmailStub() { /* no-op when SMTP is not configured */ }

export function resolvePasswordResetDeliverer(override) {
  if (override) return override;
  if (isSmtpConfigured()) return createDefaultPasswordResetDeliverer();
  return sendResetEmailStub;
}

export async function requestPasswordReset(email, { deliver } = {}) {
  const deliverFn = resolvePasswordResetDeliverer(deliver);
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

  // Supabase Auth reset trigger if configured
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const frontendBase = Array.isArray(env.frontendOrigin) ? env.frontendOrigin[0] : (env.frontendOrigin || 'http://localhost:5180');
      const redirectTo = `${frontendBase}${env.passwordResetPublicPath || '/password-reset'}`;
      await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    } catch {}
  }

  try { await deliverFn({ email: user.email, token, expiresInMinutes: 30 }); } catch { /* Keep public response generic. */ }
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
    if (!rows[0]) {
      await client.query('ROLLBACK');
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const ok = await updatePasswordWithRecoverySession(token, password);
          if (ok) return true;
        } catch {}
      }
      return false;
    }
    await client.query('UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1', [rows[0].user_id, passwordHash]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [rows[0].user_id]);

    // Update Supabase Auth password as well
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.auth.admin.updateUserById(rows[0].user_id, { password }).catch(() => {});
      await client.query('UPDATE auth.users SET encrypted_password=$2 WHERE id=$1', [rows[0].user_id, passwordHash]).catch(() => {});
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function updatePasswordWithRecoverySession(accessToken, newPassword) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw Object.assign(new Error('Supabase Auth is not configured'), { statusCode: 503 });
  }

  let userId = null;

  // 1. Verify access token with Supabase getUser
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      userId = data.user.id;
    }
  } catch {}

  // 2. Fallback to exchangeCodeForSession if accessToken is a PKCE code
  if (!userId) {
    try {
      const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(accessToken);
      if (!exErr && exData?.user) {
        userId = exData.user.id;
      }
    } catch {}
  }

  // 3. Fallback to verifyOtp if accessToken is a token_hash
  if (!userId) {
    try {
      const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: accessToken,
        type: 'recovery',
      });
      if (!otpErr && otpData?.user) {
        userId = otpData.user.id;
      }
    } catch {}
  }

  if (!userId) {
    throw Object.assign(new Error('Invalid or expired recovery session'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update in Supabase Auth
  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (updateErr) {
    throw Object.assign(new Error(updateErr.message), { statusCode: 400 });
  }

  // Update in public.users
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId]
  );
  await pool.query(
    'UPDATE auth.users SET encrypted_password = $1 WHERE id = $2',
    [passwordHash, userId]
  ).catch(() => {});

  return true;
}
