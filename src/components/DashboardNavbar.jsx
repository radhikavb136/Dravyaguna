import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCurrentUser, logout, mergeAccountIntoStoredUser } from "../api/auth"
import { getAccount } from "../api/account"
import NotificationBell from "./NotificationBell"
import { useUiText } from "../i18n/useUiText"

function DashboardNavbar() {
  const t = useUiText()
  const navigate = useNavigate()

  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const profileRef = useRef(null)

  const useApi = import.meta.env.VITE_USE_API === 'true'
  const readCurrentUser = () => {
    return useApi
      ? getCurrentUser()
      : (getCurrentUser() || JSON.parse(localStorage.getItem(['herb', 'User'].join('')) || "null"))
  }

  const [currentUser, setCurrentUserState] = useState(readCurrentUser)
  const [profilePhoto, setProfilePhoto] = useState(() => currentUser?.profilePhoto || "")

  const doctorName = currentUser?.fullName || currentUser?.full_name || "Doctor"
  const doctorEmail = currentUser?.email || "Ayurvedic Physician"
  const doctorInitials = doctorName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const syncUser = () => {
      const u = readCurrentUser()
      setCurrentUserState(u)
      setProfilePhoto(u?.profilePhoto || "")
    }
    syncUser()
    if (import.meta.env.VITE_USE_API === 'true') {
      getAccount()
        .then((account) => {
          const merged = mergeAccountIntoStoredUser(account)
          setCurrentUserState(merged)
          setProfilePhoto(merged?.profilePhoto || "")
        })
        .catch(() => {})
    }
    window.addEventListener("dravyaguna-user-updated", syncUser)
    return () => window.removeEventListener("dravyaguna-user-updated", syncUser)
  }, [])

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
      navigate("/help-support")
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
      logout()
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
      </div>


      {/* Right Side */}
      <div className="navbar-actions">

        <NotificationBell className="notification-button" />


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
