import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCurrentUser } from "../api/auth"
import { useUiText } from "../i18n/useUiText"

function DashboardNavbar() {
  const t = useUiText()
  const navigate = useNavigate()

  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const profileRef = useRef(null)

  const useApi = import.meta.env.VITE_USE_API === 'true'
  const savedUser = useApi
    ? getCurrentUser()
    : JSON.parse(localStorage.getItem("herbUser") || "null")

  const doctorName = savedUser?.fullName || "Doctor"
  const doctorEmail = savedUser?.email || "Ayurvedic Physician"
  const profilePhoto = savedUser?.profilePhoto || ""
  const doctorInitials = doctorName
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((name) => name[0])
  .join("")
  .slice(0, 2)
  .toUpperCase()


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  // Close dropdown with Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const handleProfileAction = (action) => {
    setIsProfileOpen(false)

    if (action === "profile") {
      navigate("/profile")
    }

    if (action === "settings") {
      navigate("/settings")
    }

    if (action === "help") {
      alert("Help and support will be available soon.")
    }

    if (action === "language") {
      navigate("/language")
    }

    if (action === "upgrade") {
      navigate("/upgrade")
    }

    if (action === "learn") {
      navigate("/learn-more")
    }

    if (action === "logout") {
      localStorage.removeItem("isAuthenticated")
      navigate("/auth")
    }
  }

  return (
    <header className="dashboard-navbar">

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>{t("workspace")}</span>
        <span className="breadcrumb-separator">›</span>
        <strong>{t("home")}</strong>
        {useApi && (
          <span className="api-indicator" style={{marginLeft: '10px', fontSize: '11px', color: '#28a745', background: '#e6fffa', padding: '2px 8px', borderRadius: '4px'}}>
            Using API
          </span>
        )}
        {!useApi && (
          <span className="api-indicator" style={{marginLeft: '10px', fontSize: '11px', color: '#6c757d', background: '#f8f9fa', padding: '2px 8px', borderRadius: '4px'}}>
            Using mock data
          </span>
        )}
      </div>


      {/* Right Side */}
      <div className="navbar-actions">

        {/* Notification */}
        <button
          className="notification-button"
          type="button"
        >
          🔔
        </button>


        {/* Profile */}
        <div
          className="navbar-profile-wrapper"
          ref={profileRef}
        >

          <button
            className={`navbar-profile ${
              isProfileOpen ? "profile-open" : ""
            }`}
            type="button"
            onClick={() =>
              setIsProfileOpen((previous) => !previous)
            }
          >

<div className="navbar-avatar">
  {profilePhoto ? (
    <img
      src={profilePhoto}
      alt="Profile"
      className="navbar-profile-photo"
    />
  ) : (
    doctorInitials
  )}
</div>

            <div className="navbar-doctor-info">
              <strong>{doctorName}</strong>
              <span>Ayurvedic Physician</span>
            </div>

            <span className="profile-dropdown-arrow">
              ▾
            </span>

          </button>


          {/* Dropdown */}
          {isProfileOpen && (
            <div className="profile-dropdown">

              {/* Account information */}
              <div className="profile-dropdown-header">

                <strong>{doctorName}</strong>

                <span className="profile-dropdown-email">
                  {doctorEmail}
                </span>

              </div>


              {/* Menu */}
              <div className="profile-dropdown-menu">

                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("profile")
                  }
                >
                  <span className="profile-menu-icon">
                    ◉
                  </span>

                  <span>{t("profile")}</span>
                </button>


                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("settings")
                  }
                >
                  <span className="profile-menu-icon">
                    ⚙
                  </span>

                  <span>{t("settings")}</span>
                </button>


                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("language")
                  }
                >
                  <span className="profile-menu-icon">
                    ◎
                  </span>

                  <span>{t("language")}</span>
                </button>


                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("help")
                  }
                >
                  <span className="profile-menu-icon">
                    ?
                  </span>

                  <span>{t("helpSupport")}</span>
                </button>


                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("upgrade")
                  }
                >
                  <span className="profile-menu-icon">
                    ✦
                  </span>

                  <span>{t("upgrade")}</span>
                </button>


                <button
                  className="profile-menu-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("learn")
                  }
                >
                  <span className="profile-menu-icon">
                    ◇
                  </span>

                  <span>{t("learnMore")}</span>

                  <span className="profile-menu-arrow">
                    ›
                  </span>
                </button>

              </div>


              {/* Logout */}
              <div className="profile-dropdown-footer">

                <button
                  className="profile-menu-item logout-item"
                  type="button"
                  onClick={() =>
                    handleProfileAction("logout")
                  }
                >
                  <span className="profile-menu-icon">
                    ↪
                  </span>

                  <span>{t("logout")}</span>
                </button>

              </div>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}

export default DashboardNavbar
