import { withE2ePool } from './db.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:4010';

export async function deleteUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return withE2ePool(async (pool) => {
    await pool.query('DELETE FROM users WHERE email = $1', [normalized]);
  });
}

export async function getUserRoleByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return withE2ePool(async (pool) => {
    const { rows } = await pool.query('SELECT role FROM users WHERE email = $1', [normalized]);
    return rows[0]?.role ?? null;
  });
}

export async function registerViaApi({ email, password, fullName, role }) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName,
      name: fullName,
      role,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
