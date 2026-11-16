import { apiClient } from './client.js';

export async function fetchNotifications({ limit = 30, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiClient.get(`/api/notifications?${params.toString()}`);
}

export async function fetchUnreadCount() {
  return apiClient.get('/api/notifications/unread-count');
}

export async function markNotificationRead(id) {
  return apiClient.post(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead() {
  return apiClient.post('/api/notifications/read-all', {});
}
