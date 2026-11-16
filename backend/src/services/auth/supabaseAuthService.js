import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { pool } from '../../db/pool.js';
import { ROLES } from '../../utils/roles.js';

let supabaseAdminClient = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }
  supabaseAdminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseAdminClient;
}

export function isSupabaseAuthConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

/**
 * Register a new user in Supabase Auth and link to public.users profile.
 */
export async function registerWithSupabase({ email, password, fullName }) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);

  // If Supabase Auth is configured, use it as identity provider
  if (supabase) {
    // 1. Create in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already') || authError.status === 422) {
        const err = new Error('Email already registered');
        err.code = '23505';
        err.statusCode = 409;
        throw err;
      }
      throw authError;
    }

    const authUser = authData.user;

    // 2. Insert into public.users with the exact same UUID as authUser.id and password_hash
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           updated_at = NOW()
         RETURNING id, email, full_name, role, status, created_at`,
        [authUser.id, normalizedEmail, passwordHash, fullName, ROLES.CLINICIAN, 'active']
      );
      return rows[0];
    } catch (dbErr) {
      // Rollback auth user creation if public.users insert fails
      if (authUser?.id) {
        await supabase.auth.admin.deleteUser(authUser.id).catch(() => {});
      }
      throw dbErr;
    }
  }

  // Fallback to local DB if Supabase not configured
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, status, created_at`,
    [normalizedEmail, passwordHash, fullName, ROLES.CLINICIAN]
  );
  return rows[0];
}

/**
 * Login user via Supabase Auth with seamless fallback/migration for existing users.
 */
export async function loginWithSupabase({ email, password }) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Query public.users profile
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, full_name, role, status
     FROM users WHERE email = $1`,
    [normalizedEmail]
  );
  const user = rows[0];
  if (!user || user.status !== 'active') {
    return null;
  }

  // 2. If Supabase Auth is active, authenticate against Supabase Auth
  if (supabase) {
    // Attempt Supabase sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!signInError && signInData?.session) {
      // Successfully authenticated via Supabase Auth
      const token = jwt.sign(
        { email: user.email, role: user.role, supabase_id: signInData.user.id },
        env.jwtSecret,
        { subject: user.id, expiresIn: env.jwtExpiresIn }
      );

      return {
        token,
        supabaseSession: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at,
        },
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
      };
    }

    // If Supabase Auth login failed, check if this is an unmigrated existing user with bcrypt password_hash
    if (user.password_hash) {
      const ok = await bcrypt.compare(password, user.password_hash);
      if (ok) {
        // Password is correct! Seamlessly migrate/ensure this user in auth.users
        try {
          const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            id: user.id,
            email: user.email,
            password,
            email_confirm: true,
            user_metadata: { full_name: user.full_name },
          });

          if (!createErr && created?.user) {
            // Update auth.users password hash directly to match
            await pool.query(
              'UPDATE auth.users SET encrypted_password = $1 WHERE id = $2',
              [user.password_hash, user.id]
            ).catch(() => {});
          }
        } catch {}

        const token = jwt.sign(
          { email: user.email, role: user.role, supabase_id: user.id },
          env.jwtSecret,
          { subject: user.id, expiresIn: env.jwtExpiresIn }
        );

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
          },
        };
      }
    }

    return null;
  }

  // Local fallback without Supabase
  if (!user.password_hash) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const token = jwt.sign(
    { email: user.email, role: user.role },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
  };
}

/**
 * Migration script: Migrate all existing public.users into auth.users idempotently
 */
export async function migrateAllUsersToSupabaseAuth() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase Auth is not configured');
  }

  const { rows: publicUsers } = await pool.query(
    'SELECT id, email, password_hash, full_name, role, status FROM users'
  );

  const results = {
    total: publicUsers.length,
    migrated: 0,
    already_existed: 0,
    failed: 0,
    errors: [],
  };

  for (const user of publicUsers) {
    try {
      // Check if user already exists in auth.users
      const { rows: authRows } = await pool.query(
        'SELECT id FROM auth.users WHERE id = $1 OR email = $2',
        [user.id, user.email.toLowerCase()]
      );

      if (authRows.length > 0) {
        results.already_existed++;
        // If password_hash exists, ensure auth.users has the same password_hash
        if (user.password_hash) {
          await pool.query(
            'UPDATE auth.users SET encrypted_password = $1 WHERE id = $2',
            [user.password_hash, authRows[0].id]
          );
        }
        continue;
      }

      // Create in auth.users with the exact same ID
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email.toLowerCase(),
        password: 'TemporaryInitialPass123!',
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
        },
      });

      if (error) {
        results.failed++;
        results.errors.push({ email: user.email, error: error.message });
      } else {
        // Set encrypted_password directly to the user's existing bcrypt hash
        if (user.password_hash) {
          await pool.query(
            'UPDATE auth.users SET encrypted_password = $1 WHERE id = $2',
            [user.password_hash, user.id]
          );
        }
        results.migrated++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ email: user.email, error: err.message });
    }
  }

  return results;
}
