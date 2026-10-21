import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import AdminProfileDropdown from "./AdminProfileDropdown"
import { getCurrentUser } from "../api/auth"
import { getBackendRole } from "../utils/roles"

function AdminSidebar() {
  const location = useLocation()
  const role = getBackendRole(getCurrentUser())
  const isAdmin = role === "admin"
  const canEditHerbs = ["admin", "editor", "domain_expert"].includes(role)
  const canConfigureScoring = ["admin", "domain_expert"].includes(role)

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] =
    useState(false)

  return (
    <aside className="admin-sidebar">

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
            Ayurvedic Herb Intelligence
          </span>

        </div>

      </div>


      {/* =====================================================
          NAVIGATION
         ===================================================== */}

      <nav className="admin-navigation">

        <p className="admin-nav-label">
          WORKSPACE
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
          <span>Dashboard</span>
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
          <span>Manage Herbs</span>
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
          <span>Add Herb</span>
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
          <span>Vocabulary</span>
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
          <span>Scoring Configuration</span>
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
          <span>Search Analytics</span>
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
          <span>User & Role Management</span>
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
          <span>Audit Log</span>
        </Link>}

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
