import { useUiText } from "../i18n/useUiText"
import NotificationBell from "./NotificationBell"

function AdminNavbar({ onMobileMenuToggle }) {
  const t = useUiText()

  return (
    <header className="admin-topbar">

      {/* Mobile menu toggle */}
      <button
        className="admin-navbar-toggle"
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <span className="admin-topbar-title">
        {t("adminTopbarTitle")}
      </span>

      <div className="admin-topbar-actions">

        {/* Quick Search */}
        <div className="admin-search">

          <span>
            ⌕
          </span>

          <input
            type="text"
            placeholder={t("adminQuickSearch")}
          />

        </div>


        <NotificationBell className="admin-notification" />

      </div>

    </header>
  )
}

export default AdminNavbar
