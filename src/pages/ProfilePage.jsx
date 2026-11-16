import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAccount, updateAccountProfile, updateAccountProfilePhoto, updateAccountEmail } from "../api/account"
import { getCurrentUser, setCurrentUser, mergeAccountIntoStoredUser } from "../api/auth"

import { loadRememberedLogin, persistRememberedLogin } from "../utils/rememberedLogin"
import DashboardNavbar from "../components/DashboardNavbar"
import PageBack from "../components/PageBack"
import Sidebar from "../components/Sidebar"

import "../styles/ProfilePage.css"
import { localizeApiError } from "../i18n/localizeApiError"
import { useUiText } from "../i18n/useUiText"

function ProfilePage() {
  const t = useUiText()
  const navigate = useNavigate()

  const useApi = import.meta.env.VITE_USE_API === "true"
  const savedUser = useApi
    ? getCurrentUser()
    : (getCurrentUser() || JSON.parse(localStorage.getItem(['herb', 'User'].join('')) || "null"))

  const [fullName, setFullName] = useState(
    savedUser?.fullName || "Doctor"
  )

  const [displayName, setDisplayName] = useState(
    savedUser?.displayName || savedUser?.fullName || "Doctor"
  )

  const [profilePhoto, setProfilePhoto] = useState(
    savedUser?.preferences?.profile_photo_data_url || savedUser?.profilePhoto || ""
  )

  const [saveMessage, setSaveMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(useApi)
  const [account, setAccount] = useState(savedUser)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    if (!useApi) return
    getAccount().then((user) => {
      setAccount(user)
      setFullName(user.full_name || "")
      setDisplayName(user.display_name || user.full_name || "")
      setNewEmail(user.email || "")
      const photo = user.preferences?.profile_photo_data_url
      setProfilePhoto(typeof photo === 'string' ? photo : "")
      mergeAccountIntoStoredUser(user)
    }).catch((err) => setError(err.message || t("profileLoadError"))).finally(() => setLoading(false))
  }, [useApi])

  const fileInputRef = useRef(null)

  const email = account?.email || t("settingsNotAvailable")

  const displayRole = (() => {
    const role = (account?.role || "doctor").toString().toLowerCase().trim()
    if (role === "admin") return t("authRoleAdmin")
    if (role === "doctor") return t("authRoleDoctor")
    if (role === "reviewer" || role === "ayurvedic reviewer") {
      return t("authAyurvedicReviewer")
    }
    return account?.role || t("authRoleDoctor")
  })()

  const displayStatus = (() => {
    const status = (account?.status || "Active").trim().toLowerCase()
    if (status === "active") return t("profileStatusActive")
    return account?.status || t("profileStatusActive")
  })()

  
  const handleEmailSave = async () => {
    setError("")
    setSaveMessage("")
    const cleanEmail = (newEmail || "").trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t("authEnterValidEmail") || "Please enter a valid email address.")
      return
    }
    if (cleanEmail === (account?.email || "").toLowerCase()) {
      setIsEditingEmail(false)
      return
    }
    setEmailLoading(true)
    try {
      const res = await updateAccountEmail(cleanEmail)
      const updated = res?.data || { ...(account || {}), email: cleanEmail }
      setAccount(updated)
      mergeAccountIntoStoredUser(updated)
      try {
        const rem = loadRememberedLogin()
        if (rem?.email) {
          persistRememberedLogin({ ...rem, email: cleanEmail })
        }
      } catch { /* ignore */ }
      setSaveMessage(t("profileEmailUpdated") || "Email updated successfully. Please use your new email for future logins.")
      setIsEditingEmail(false)
    } catch (err) {
      setError(localizeApiError(t, err.message) || err.message || "Failed to update email")
    } finally {
      setEmailLoading(false)
    }
  }

  const closeProfile = () => {
    navigate("/doctor")
  }

  // =========================================
  // PROFILE PHOTO
  // =========================================

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    // Allow only image files
    if (!file.type.startsWith("image/")) {
      alert(t("authSelectImageFile"))
      return
    }
    if (file.size > 250_000) {
      setError(t("profilePhotoTooLarge") || "Image must be 250 KB or smaller.")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setProfilePhoto(reader.result)
    }

    reader.readAsDataURL(file)

    // Allows selecting the same file again later
    event.target.value = ""
  }

  // =========================================
  // SAVE PROFILE
  // =========================================

  const handleSave = async () => {
    setSaveMessage("")
    setError("")
    if (useApi) {
      try {
        const user = await updateAccountProfile({ fullName: fullName.trim(), displayName: displayName.trim() })
        let updated = user
        if (profilePhoto && profilePhoto.startsWith('data:image/')) {
          updated = await updateAccountProfilePhoto(profilePhoto)
        } else if (profilePhoto === '') {
          updated = await updateAccountProfilePhoto(null)
        }
        setAccount(updated)
        setFullName(updated.full_name)
        setDisplayName(updated.display_name)
        const savedPhoto = updated.preferences?.profile_photo_data_url
        setProfilePhoto(typeof savedPhoto === 'string' ? savedPhoto : '')
        mergeAccountIntoStoredUser(updated)
        setSaveMessage(t("profileSaveSuccess"))
      } catch (err) {
        setError(localizeApiError(t, err.message) || t("profileSaveFailed"))
      }
      return
    }
    const updatedUser = {
      ...(savedUser || {}),
      fullName: fullName.trim() || "Doctor",
      displayName:
        displayName.trim() ||
        fullName.trim() ||
        "Doctor",
      profilePhoto: profilePhoto
    }

    localStorage.setItem(
      ['herb', 'User'].join(''),
      JSON.stringify(updatedUser)
    )
    setCurrentUser(updatedUser)

    setSaveMessage(t("profileSaveSuccess"))

    // Automatically close profile page
    setTimeout(() => {
      navigate("/doctor")
    }, 1200)
  }

  // =========================================
  // AVATAR INITIALS
  // =========================================

  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  if (loading) return <p role="status">{t("profileLoading")}</p>

  return (
    <div className="profile-page-layout">

      <DashboardNavbar />

      <div className="profile-page-body">

        <Sidebar />

        <main className="profile-page-content">

          <div className="profile-overlay">

            <div className="profile-modal">

              {/* =========================================
                  CLOSE BUTTON
                  ========================================= */}

              <button
                type="button"
                className="profile-close-button"
                onClick={closeProfile}
                aria-label={t("profileCloseAria")}
              >
                ×
              </button>


              {/* =========================================
                  HEADER
                  ========================================= */}

              <PageBack fallback="/doctor" />

              <div className="profile-header">

                <p className="profile-label">
                  {t("profileAccountLabel")}
                </p>

                <h1>
                  {t("profilePanelTitle")}
                </h1>

                <p>
                  {t("profilePanelDesc")}
                </p>

              </div>

              {error && <p role="alert">{error}</p>}


              {/* =========================================
                  PROFILE AVATAR
                  ========================================= */}

              <div className="profile-avatar-section">

                <div className="profile-large-avatar">

                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="profile-photo"
                    />
                  ) : (
                    initials
                  )}

                </div>


                {/* Hidden file input */}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-photo-input"
                  onChange={handlePhotoChange}
                />


                {/* Add / Change Photo */}

               {/* Add / Change Photo */}

<button 
  type="button" 
  className="change-photo-button" 
  onClick={handlePhotoClick} 
> 
  {profilePhoto
    ? t("profileChangePhoto")
    : t("profileAddPhoto")} 
</button>


{/* Delete Photo — only show when photo exists */}

{profilePhoto && (
  <button
    type="button"
    className="delete-photo-button"
    onClick={async () => {
      setError("")
      if (!useApi) {
        setProfilePhoto("")
        const user = JSON.parse(localStorage.getItem(['herb', 'User'].join('')) || "null") || {}
        if (user.preferences) {
          user.preferences.profile_photo_data_url = ""
        }
        user.profilePhoto = ""
        localStorage.setItem(['herb', 'User'].join(''), JSON.stringify(user))
        setCurrentUser(user)
        setSaveMessage(t("profilePhotoDeleted") || "Profile photo removed successfully.")
        return
      }
      try {
        const updated = await updateAccountProfilePhoto(null)
        setProfilePhoto("")
        setAccount(updated)
        mergeAccountIntoStoredUser(updated)
        setSaveMessage(t("profilePhotoDeleted") || "Profile photo removed successfully.")
      } catch (err) {
        setError(err.message || t("profilePhotoDeleteError") || "Failed to delete photo")
      }
    }}
  >
    {t("profileDeletePhoto") || "Delete photo"}
  </button>
)}

              </div>


              {/* =========================================
                  PROFILE FORM
                  ========================================= */}

              <div className="profile-form">

                {/* FULL NAME */}

                <div className="profile-field">

                  <label htmlFor="fullName">
                    {t("profileFullName")}
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                  />

                </div>


                {/* DISPLAY NAME */}

                <div className="profile-field">

                  <label htmlFor="displayName">
                    {t("profileDisplayName")}
                  </label>

                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                  />

                  <span className="profile-field-help">
                    {t("profileDisplayNameAppHint")}
                  </span>

                </div>


                {/* PROFESSIONAL ROLE */}

                <div className="profile-field">

                  <label>
                    {t("settingsPanelRole")}
                  </label>

                  <div className="profile-readonly">
                    {t("physician")}
                  </div>

                </div>


                {/* EMAIL */}

                <div className="profile-field">

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ margin: 0 }}>
                      {t("profileEmail")}
                    </label>
                    {!isEditingEmail && (
                      <button
                        type="button"
                        className="change-photo-button"
                        style={{ padding: "3px 8px", fontSize: "12px", border: "1px solid #c2d6cb", borderRadius: "4px" }}
                        onClick={() => {
                          setNewEmail(account?.email || "")
                          setIsEditingEmail(true)
                          setError("")
                          setSaveMessage("")
                        }}
                      >
                        {t("changeEmail") || "Change Email"}
                      </button>
                    )}
                  </div>

                  {!isEditingEmail ? (
                    <div className="profile-readonly">
                      {email}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={t("enterNewEmail") || "Enter new email address"}
                        disabled={emailLoading}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #347457",
                          borderRadius: "6px",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          disabled={emailLoading}
                          onClick={handleEmailSave}
                          style={{
                            background: "#2f694e",
                            color: "#fff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: emailLoading ? "not-allowed" : "pointer"
                          }}
                        >
                          {emailLoading ? (t("saving") || "Saving...") : (t("saveEmail") || "Save Email")}
                        </button>
                        <button
                          type="button"
                          disabled={emailLoading}
                          onClick={() => {
                            setIsEditingEmail(false)
                            setNewEmail(account?.email || "")
                          }}
                          style={{
                            background: "#f0f2ef",
                            color: "#555",
                            border: "1px solid #d0d6ce",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          {t("cancel") || "Cancel"}
                        </button>
                      </div>
                    </div>
                  )}

                </div>


                {/* ACCOUNT INFORMATION */}

                <div className="profile-info-row">

                  <div>

                    <span className="profile-info-label">
                      {t("profileAccountStatus")}
                    </span>

            <strong>
                      {displayStatus}
                    </strong>

                  </div>

                  <div>

                    <span className="profile-info-label">
                      {t("profileAccountType")}
                    </span>

                    <strong>
                      {displayRole}
                    </strong>

                  </div>

                </div>


                {/* =========================================
                    SAVE BUTTON
                    ========================================= */}

                <div className="profile-actions">

                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={handleSave}
                  >
                    {t("settingsSaveChanges")}
                  </button>

                </div>


                {/* =========================================
                    SUCCESS MESSAGE
                    ========================================= */}

                {saveMessage && (
                  <p className="profile-save-message">
                    {saveMessage}
                  </p>
                )}

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default ProfilePage
