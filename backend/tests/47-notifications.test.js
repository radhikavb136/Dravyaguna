import { assert, assertEqual } from './lib/assert.js';
import { api } from './lib/http.js';
import { getTokens } from './lib/session.js';
import { getTestPool } from './lib/testPool.js';

export async function run() {
  const { tokens, users } = await getTokens();

  const list = await api('GET', '/api/notifications', { token: tokens.clinician });
  assert(list.ok, `list notifications (${list.status})`);
  assert(Array.isArray(list.data.items), 'items array');

  const countRes = await api('GET', '/api/notifications/unread-count', { token: tokens.clinician });
  assert(countRes.ok, `unread count (${countRes.status})`);
  assert(typeof countRes.data.count === 'number', 'count is number');

  const pool = getTestPool();
  const insert = await pool.query(
    `INSERT INTO user_notifications (user_id, kind, title, body, link_path)
     VALUES ($1, 'test', 'Test notice', 'Automated test notification', '/doctor')
     RETURNING id`,
    [users.clinician.id]
  );
  const notificationId = insert.rows[0].id;

  const afterCount = await api('GET', '/api/notifications/unread-count', { token: tokens.clinician });
  assert(afterCount.data.count >= 1, 'unread increases after insert');

  const read = await api('POST', `/api/notifications/${notificationId}/read`, {
    token: tokens.clinician,
    body: {},
  });
  assert(read.ok, `mark read (${read.status})`);
  assert(read.data.readAt, 'readAt set');

  const other = await api('GET', `/api/notifications`, { token: tokens.admin });
  assert(other.ok, 'admin can list own notifications');

  const crossRead = await api('POST', `/api/notifications/${notificationId}/read`, {
    token: tokens.admin,
    body: {},
  });
  assertEqual(crossRead.status, 404, 'cannot read another user notification');

  await pool.query('DELETE FROM user_notifications WHERE id = $1', [notificationId]);
}
