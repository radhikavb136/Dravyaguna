import { pool } from '../../db/pool.js';
import { logAudit } from '../audit/auditService.js';
import { createNotification, notifyUsersWithRoles } from '../notifications/notificationService.js';

export const SUPPORT_TOPICS = new Set([
  'search',
  'herb',
  'account',
  'billing',
  'technical',
  'other',
]);

export const SUPPORT_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);

export async function createSupportRequest({ userId, topic, message }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO support_requests (user_id, topic, message, status)
       VALUES ($1, $2, $3, 'open')
       RETURNING id, user_id, topic, message, status, created_at`,
      [userId, topic, message]
    );
    const request = rows[0];
    await logAudit({
      userId,
      action: 'support_request_created',
      entityType: 'support_request',
      entityId: request.id,
      before: {},
      after: { topic: request.topic, status: request.status },
      client,
    });
    await client.query('COMMIT');
    try {
      await notifyUsersWithRoles(['admin'], {
        kind: 'support_request',
        title: 'New support request',
        body: `Topic: ${request.topic}. Open the support queue to respond.`,
        linkPath: '/admin/support-requests',
      });
      await createNotification({
        userId,
        kind: 'support_request_ack',
        title: 'Support request received',
        body: 'Your message was saved. An administrator will review it when available.',
        linkPath: '/help-support',
      });
    } catch (notifyError) {
      console.error('support notification dispatch failed', notifyError);
    }
    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listSupportRequestsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, topic, message, status, created_at
     FROM support_requests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function countSupportRequestsForAdmin() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM support_requests');
  return rows[0]?.total ?? 0;
}

export async function listSupportRequestsForAdmin({ limit = 100, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT sr.id, sr.topic, sr.message, sr.status, sr.created_at,
            u.email AS user_email, u.full_name AS user_full_name
     FROM support_requests sr
     JOIN users u ON u.id = sr.user_id
     ORDER BY sr.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function updateSupportRequestStatus({ requestId, status, adminUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      'SELECT id, status, topic FROM support_requests WHERE id = $1',
      [requestId]
    );
    if (!existing[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const before = existing[0];
    const { rows } = await client.query(
      `UPDATE support_requests SET status = $1 WHERE id = $2
       RETURNING id, topic, message, status, created_at, user_id`,
      [status, requestId]
    );
    await logAudit({
      userId: adminUserId,
      action: 'support_request_status_updated',
      entityType: 'support_request',
      entityId: requestId,
      before: { status: before.status },
      after: { status },
      client,
    });
    await client.query('COMMIT');
    const updated = rows[0];
    if (updated?.user_id && before.status !== status) {
      await createNotification({
        userId: updated.user_id,
        kind: 'support_request_update',
        title: 'Support request updated',
        body: `Your request is now marked "${status}".`,
        linkPath: '/help-support',
      });
    }
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
