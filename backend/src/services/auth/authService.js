import { registerWithSupabase, loginWithSupabase } from './supabaseAuthService.js';

export async function registerUser({ email, password, fullName }) {
  return registerWithSupabase({ email, password, fullName });
}

export async function loginUser({ email, password }) {
  return loginWithSupabase({ email, password });
}

