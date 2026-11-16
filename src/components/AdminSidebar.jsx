import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import AdminProfileDropdown from "./AdminProfileDropdown"
import { getCurrentUser } from "../api/auth"
import { getBackendRole } from "../utils/roles"
import { useUiText } from "../i18n/useUiText"

function AdminSidebar({ onMobileMenuToggle, isMobileMenuOpen }) {
  const t = useUiText()
  const location = useLocation()
  const role = getBackendRole(getCurrentUser())
  const isAdmin = role === "admin"
  const canEditHerbs = ["admin", "editor", "domain_expert"].includes(role)
  const canConfigureScoring = ["admin", "domain_expert"].includes(role)

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] =
    useState(false)

  return (
    <aside className={`admin-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>

      {/* =====================================================
          MOBILE MENU TOGGLE
         ===================================================== */}
      <button
        className={`admin-mobile-toggle ${isMobileMenuOpen ? "open" : ""}`}
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* =====================================================
          BRAND
         ===================================================== */}

      <div className="admin-brand">

        <div className="admin-brand-icon">
          🌿
        </div>

        <div className="admin-brand-text">

          <h2>
            Dravyaguna
          </h2>

          <span>
            {t("adminBrandSubtitle")}
          </span>

        </div>

      </div>


      {/* =====================================================
          NAVIGATION
         ===================================================== */}

      <nav className="admin-navigation">

        <p className="admin-nav-label">
          {t("adminNavWorkspace")}
        </p>


        {/* Dashboard */}
        {["admin", "domain_expert"].includes(role) && <Link
          to="/admin"
          className={`admin-nav-item ${
            location.pathname === "/admin"
              ? "active"
              : ""
          }`}
        >
          <span>▦</span>
          <span>{t("adminDashboard")}</span>
        </Link>}


        {/* Manage Herbs */}
        {canEditHerbs && <Link
          to="/admin/manage-herbs"
          className={`admin-nav-item ${
            location.pathname === "/admin/manage-herbs"
              ? "active"
              : ""
          }`}
        >
          <span>♧</span>
          <span>{t("adminManageHerbs")}</span>
        </Link>}


        {/* Add Herb */}
        {canEditHerbs && <Link
          to="/admin/add-herb"
          className={`admin-nav-item ${
            location.pathname === "/admin/add-herb"
              ? "active"
              : ""
          }`}
        >
          <span>＋</span>
          <span>{t("adminAddHerb")}</span>
        </Link>}


        {/* Vocabulary */}
        {canEditHerbs && <Link
          to="/admin/vocabulary"
          className={`admin-nav-item ${
            location.pathname === "/admin/vocabulary"
              ? "active"
              : ""
          }`}
        >
          <span>▣</span>
          <span>{t("adminVocabulary")}</span>
        </Link>}


        {/* Scoring Configuration */}
        {canConfigureScoring && <Link
          to="/admin/scoring"
          className={`admin-nav-item ${
            location.pathname === "/admin/scoring"
              ? "active"
              : ""
          }`}
        >
          <span>⚙</span>
          <span>{t("adminScoring")}</span>
        </Link>}


        {/* Search Analytics */}
        {["admin", "domain_expert"].includes(role) && <Link
          to="/admin/search-analytics"
          className={`admin-nav-item ${
            location.pathname === "/admin/search-analytics"
              ? "active"
              : ""
          }`}
        >
          <span>⌁</span>
          <span>{t("adminSearchAnalytics")}</span>
        </Link>}


        {/* User & Role Management */}
        {isAdmin && <Link
          to="/admin/users"
          className={`admin-nav-item ${
            location.pathname === "/admin/users"
              ? "active"
              : ""
          }`}
        >
          <span>♙</span>
          <span>{t("adminUsers")}</span>
        </Link>}


        {/* Audit Log */}
        {isAdmin && <Link
          to="/admin/audit-log"
          className={`admin-nav-item ${
            location.pathname === "/admin/audit-log"
              ? "active"
              : ""
          }`}
        >
          <span>▤</span>
          <span>{t("adminAuditLog")}</span>
        </Link>}

        {/* Help & Support */}
        <Link
          to="/admin/help-support"
          className={`admin-nav-item ${
            location.pathname === "/admin/help-support"
              ? "active"
              : ""
          }`}
        >
          <span>?</span>
          <span>{t("helpSupport")}</span>
        </Link>

      </nav>


      {/* =====================================================
          ADMIN PROFILE + DROPDOWN
         ===================================================== */}

<div className="admin-profile-wrapper">

<AdminProfileDropdown
  isOpen={isProfileDropdownOpen}
  onToggle={() =>
    setIsProfileDropdownOpen(
      (previous) => !previous
    )
  }
  onClose={() =>
    setIsProfileDropdownOpen(false)
  }
/>

</div>



        

    </aside>
  )
}

export default AdminSidebar
