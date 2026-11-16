import { useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import AdminSidebar from "./AdminSidebar"
import AdminNavbar from "./AdminNavbar"
import AdminBackNav from "./AdminBackNav"
import { getCurrentUser, isAuthenticated } from "../api/auth"
import { getBackendRole } from "../utils/roles"
import "../styles/AdminDashboard.css"

function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!isAuthenticated()) return <Navigate to="/auth" replace />

  const user = getCurrentUser()
  const role = getBackendRole(user)
  if (!role || role === "clinician") return <Navigate to="/doctor" replace />

  return (
    <div className="admin-dashboard">

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="admin-sidebar-overlay active"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <AdminSidebar onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} isMobileMenuOpen={isMobileMenuOpen} />

      {/* Admin Main Area */}
      <div className="admin-main">

        {/* Admin Top Navbar */}
        <AdminNavbar onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        {/* Page Content */}
        <main className="admin-content">
          <AdminBackNav />
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default AdminLayout
