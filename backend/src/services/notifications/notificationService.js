import { pool } from '../../db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at,
    createdAt: row.created_at,
    unread: !row.read_at,
  };
}

export async function createNotification({ userId, kind, title, body, linkPath = null, client = null }) {
  const db = client || pool;
  try {
    const { rows } = await db.query(
      `INSERT INTO user_notifications (user_id, kind, title, body, link_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, kind, title, body, linkPath]
    );
    return mapRow(rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return null;
    }
    throw err;
  }
}

export async function notifyUsersWithRoles(roles, payload) {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = ANY($1::text[]) AND status = 'active'`,
    [roles]
  );
  const created = [];
  for (const row of rows) {
    const item = await createNotification({ userId: row.id, ...payload });
    if (item) created.push(item);
  }
  return created;
}

export async function listNotificationsForUser(userId, { limit = 30, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, safeOffset]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM user_notifications WHERE user_id = $1`,
      [userId]
    );
    return {
      items: rows.map(mapRow),
      total: countRows[0]?.total || 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  } catch (err) {
    if (err.code === '42P01') {
      return {
        items: [],
        total: 0,
        limit: safeLimit,
        offset: safeOffset,
      };
    }
    throw err;
  }
}

export async function unreadNotificationCount(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM user_notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return rows[0]?.count || 0;
  } catch (err) {
    if (err.code === '42P01') {
      return 0;
    }
    throw err;
  }
}

export async function markNotificationRead(userId, notificationId) {
  try {
    const { rows } = await pool.query(
      `UPDATE user_notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    if (!rows[0]) return null;
    return mapRow(rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return null;
    }
    throw err;
  }
}

export async function markAllNotificationsRead(userId) {
  try {
    await pool.query(
      `UPDATE user_notifications SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return { ok: true };
  } catch (err) {
    if (err.code === '42P01') {
      return { ok: true };
    }
    throw err;
  }
}
