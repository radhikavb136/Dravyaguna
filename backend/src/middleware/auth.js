import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, status FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive or no longer exists' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

/** Any authenticated user including clinician (search). */
export function requireAuthenticated(req, res, next) {
  return authenticate(req, res, next);
}
