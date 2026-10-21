import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccount, updateAccountProfile } from "../api/account"

import "../styles/AdminProfilePage.css"

function AdminProfilePage() {
  const navigate = useNavigate()

  // =========================================
  // ADMIN USER
  // =========================================

  const [account, setAccount] = useState(null)
  const [fullName, setFullName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [profilePhoto, setProfilePhoto] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const email = account?.email || ""
  const role = account?.role || ""

  useEffect(() => {
    getAccount().then((data) => {
      setAccount(data)
      setFullName(data.full_name || "")
      setDisplayName(data.display_name || data.full_name || "")
    }).catch((err) => setError(err.message || "Unable to load profile")).finally(() => setLoading(false))
  }, [])

  const [saveMessage, setSaveMessage] = useState("")

  const fileInputRef = useRef(null)

  // =========================================
  // CLOSE PROFILE
  // =========================================

  const closeProfile = () => {
    navigate("/admin")
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

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setProfilePhoto(reader.result)
    }

    reader.readAsDataURL(file)

    // Allows selecting the same file again
    event.target.value = ""
  }

  const handleDeletePhoto = () => {
    setProfilePhoto("")
  }

  // =========================================
  // SAVE PROFILE
  // =========================================

  const handleSave = async () => {
    setSaveMessage("")
    setError("")
    try {
      const updated = await updateAccountProfile({
        fullName: fullName.trim(),
        displayName: displayName.trim(),
      })
      setAccount(updated)
      setFullName(updated.full_name)
      setDisplayName(updated.display_name)
      window.dispatchEvent(new Event("adminProfileUpdated"))
      setSaveMessage(profilePhoto
        ? "Profile details saved. The selected photo is only a temporary preview; photo uploads are not configured."
        : "Profile details saved successfully.")
    } catch (err) {
      setError(err.message || "Unable to save profile")
    }
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

  if (loading) return <p role="status">Loading profile...</p>
  if (error && !account) return <p role="alert">{error}</p>

  return (
    <div className="admin-profile-page">

      {/* =========================================
          HEADER
         ========================================= */}

      <div className="admin-profile-page-header">

        <div>

          <p className="admin-profile-page-label">
            ACCOUNT
          </p>

          <h1>
            Profile
          </h1>

          <p className="admin-profile-page-description">
            Manage your administrator profile and account information.
          </p>

        </div>

        {/* Close / Back button */}

        <button
          type="button"
          className="admin-profile-close-button"
          onClick={closeProfile}
          aria-label="Close profile"
        >
          ×
        </button>

      </div>

      {error && <p role="alert">{error}</p>}


      {/* =========================================
          PROFILE PHOTO
         ========================================= */}

      <section className="admin-profile-section">

        <div className="admin-profile-section-header">

          <h2>
            Profile photo
          </h2>

          <p>
            Add a photo to personalize your administrator account.
          </p>

        </div>


        <div className="admin-profile-photo-section">

          {/* Avatar */}

          <div className="admin-profile-large-avatar">

            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Administrator profile"
                className="admin-profile-photo"
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
            className="admin-profile-photo-input"
            onChange={handlePhotoChange}
          />


          {/* Photo actions */}

          <div className="admin-profile-photo-actions">

            <button
              type="button"
              className="admin-profile-change-photo"
              onClick={handlePhotoClick}
            >
              {profilePhoto
                ? "Change photo"
                : "Add photo"}
            </button>


            {profilePhoto && (
              <button
                type="button"
                className="admin-profile-delete-photo"
                onClick={handleDeletePhoto}
              >
                Delete photo
              </button>
            )}

          </div>

        </div>

      </section>


      {/* =========================================
          BASIC INFORMATION
         ========================================= */}

      <section className="admin-profile-section">

        <div className="admin-profile-section-header">

          <h2>
            Basic information
          </h2>

          <p>
            Your basic administrator account information.
          </p>

        </div>


        <div className="admin-profile-form">

          {/* Full name */}

          <div className="admin-profile-field">

            <label htmlFor="adminFullName">
              Full name
            </label>

            <input
              id="adminFullName"
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
            />

          </div>


          {/* Display name */}

          <div className="admin-profile-field">

            <label htmlFor="adminDisplayName">
              Display name
            </label>

            <input
              id="adminDisplayName"
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
            />

            <span className="admin-profile-field-help">
              This name will be displayed across the admin workspace.
            </span>

          </div>


          {/* Email */}

          <div className="admin-profile-field">

            <label>
              Email address
            </label>

            <div className="admin-profile-readonly">
              {email}
            </div>

          </div>


          {/* Role */}

          <div className="admin-profile-field">

            <label>
              Role
            </label>

            <div className="admin-profile-readonly">
            {role}
            </div>

          </div>

        </div>

      </section>


      {/* =========================================
          ACCOUNT INFORMATION
         ========================================= */}

      <section className="admin-profile-section">

        <div className="admin-profile-section-header">

          <h2>
            Account information
          </h2>

          <p>
            Current status and administrator account details.
          </p>

        </div>


        <div className="admin-profile-info-grid">

          <div className="admin-profile-info-card">

            <span>
              Account status
            </span>

            <strong className={`admin-status-${account.status}`}>
              {account.status}
            </strong>

          </div>


          <div className="admin-profile-info-card">

            <span>
              Account type
            </span>

            <strong>
              {role}
            </strong>

          </div>


          <div className="admin-profile-info-card">

            <span>
              Access level
            </span>

            <strong>
              {role === "admin" ? "Full access" : "Restricted access"}
            </strong>

          </div>


          <div className="admin-profile-info-card">

            <span>
              Workspace
            </span>

            <strong>
              Dravyaguna
            </strong>

          </div>

        </div>

      </section>


      {/* =========================================
          ADMIN PERMISSIONS
         ========================================= */}

      <section className="admin-profile-section">

        <div className="admin-profile-section-header">

          <h2>
            Administrator permissions
          </h2>

          <p>
            Areas currently available to your administrator account.
          </p>

        </div>


        <div className="admin-profile-permissions">

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Manage Herbs</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Add and Edit Herbs</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Vocabulary Management</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Scoring Configuration</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Search Analytics</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>User & Role Management</span>
          </div>

          <div className="admin-permission-item">
            <span>✓</span>
            <span>Audit Log</span>
          </div>

        </div>

      </section>


      {/* =========================================
          ACTIONS
         ========================================= */}

      <div className="admin-profile-actions">

        <button
          type="button"
          className="admin-profile-cancel-button"
          onClick={closeProfile}
        >
          Cancel
        </button>


        <button
          type="button"
          className="admin-profile-save-button"
          onClick={handleSave}
        >
          Save changes
        </button>

      </div>


      {/* =========================================
          SUCCESS MESSAGE
         ========================================= */}

      {saveMessage && (
        <p className="admin-profile-save-message">
          {saveMessage}
        </p>
      )}

    </div>
  )
}

export default AdminProfilePage
