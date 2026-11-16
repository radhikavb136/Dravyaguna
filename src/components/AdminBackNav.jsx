import { useLocation } from 'react-router-dom';
import PageBack from './PageBack';

const ADMIN_FALLBACKS = {
  '/admin/manage-herbs': '/admin',
  '/admin/add-herb': '/admin/manage-herbs',
  '/admin/vocabulary': '/admin',
  '/admin/scoring': '/admin',
  '/admin/search-analytics': '/admin',
  '/admin/users': '/admin',
  '/admin/audit-log': '/admin',
  '/admin/support-requests': '/admin',
  '/admin/profile': '/admin',
  '/admin/settings': '/admin',
  '/admin/language': '/admin',
  '/admin/help-support': '/admin',
};

export default function AdminBackNav() {
  const { pathname } = useLocation();
  if (pathname === '/admin' || pathname === '/admin/') return null;
  const fallback = ADMIN_FALLBACKS[pathname] || '/admin';
  return (
    <div className="admin-back-nav">
      <PageBack fallback={fallback} />
    </div>
  );
}
