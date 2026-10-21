import { Navigate, Outlet } from "react-router-dom"
import AdminSidebar from "./AdminSidebar"
import AdminNavbar from "./AdminNavbar"
import { getCurrentUser, isAuthenticated } from "../api/auth"
import { getBackendRole } from "../utils/roles"
import "../styles/AdminDashboard.css"

function AdminLayout() {
  if (!isAuthenticated()) return <Navigate to="/auth" replace />

  const user = getCurrentUser()
  const role = getBackendRole(user)
  if (!role || role === "clinician") return <Navigate to="/doctor" replace />

  return (
    <div className="admin-dashboard">

      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Admin Main Area */}
      <div className="admin-main">

        {/* Admin Top Navbar */}
        <AdminNavbar />

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default AdminLayout
