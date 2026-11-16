import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { USE_API } from '../api/client';
import { useUiText } from '../i18n/useUiText';
import './NotificationBell.css';

export default function NotificationBell({ className = 'notification-button' }) {
  const t = useUiText();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!USE_API || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const [list, countRes] = await Promise.all([
        fetchNotifications({ limit: 25 }),
        fetchUnreadCount(),
      ]);
      setItems(list.items || []);
      setUnread(countRes.count || 0);
    } catch (err) {
      setError(err.message || tRef.current('notificationsLoadError'));
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!USE_API) return undefined;
    refresh();
    const onUserUpdate = () => refresh();
    window.addEventListener('dravyaguna-user-updated', onUserUpdate);
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('dravyaguna-user-updated', onUserUpdate);
      clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) refresh();
  };

  const handleItemClick = async (item) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setUnread((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString(), unread: false } : row))
        );
      } catch {
        /* keep navigation usable */
      }
    }
    setOpen(false);
    if (item.linkPath) navigate(item.linkPath);
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString(), unread: false })));
    } catch (err) {
      setError(err.message || t('notificationsMarkAllError'));
    }
  };

  if (!USE_API) {
    return (
      <button type="button" className={className} title={t('notificationsMockHint')} disabled>
        🔔
      </button>
    );
  }

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button
        type="button"
        className={className}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleOpen}
      >
        🔔
        {unread > 0 && <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label={t('notificationsTitle')}>
          <div className="notification-panel-header">
            <strong>{t('notificationsTitle')}</strong>
            {unread > 0 && (
              <button type="button" className="notification-mark-all" onClick={handleMarkAll}>
                {t('notificationsMarkAll')}
              </button>
            )}
          </div>
          {loading && <p className="notification-panel-status">{t('notificationsLoading')}</p>}
          {error && <p className="notification-panel-error" role="alert">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="notification-panel-empty">{t('notificationsEmpty')}</p>
          )}
          <ul className="notification-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`notification-item${item.unread ? ' notification-item--unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="notification-item-title">{item.title}</span>
                  <span className="notification-item-body">{item.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
