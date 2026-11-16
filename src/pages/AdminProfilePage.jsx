import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getAccount,
  updateAccountProfile,
  updateAccountProfilePhoto,
  updateAccountEmail,
} from "../api/account"
import { mergeAccountIntoStoredUser } from "../api/auth"
import { loadRememberedLogin, persistRememberedLogin } from "../utils/rememberedLogin"
import { localizeApiError } from "../i18n/localizeApiError"
import { useUiText } from "../i18n/useUiText"
import "../styles/AdminProfilePage.css"

function UserTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function ShieldTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function SecurityTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function AdminProfilePage() {
  const t = useUiText()
  const navigate = useNavigate()

  // Active Tab
  const [activeTab, setActiveTab] = useState("profile")

  // Profile State
  const [account, setAccount] = useState(null)
  const [fullName, setFullName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [profilePhoto, setProfilePhoto] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

  // Email Editing State
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)

  const fileInputRef = useRef(null)

  // Load profile data on mount
  useEffect(() => {
    let cancelled = false
    getAccount()
      .then((data) => {
        if (cancelled) return
        setAccount(data)
        setFullName(data.full_name || "")
        setDisplayName(data.display_name || data.full_name || "")
        setNewEmail(data.email || "")
        const photo = data.preferences?.profile_photo_data_url
        setProfilePhoto(typeof photo === "string" ? photo : "")
      })
      .catch((err) => {
        if (!cancelled) {
          setError(localizeApiError(t, err.message || t("adminProfLoadError")))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [t])

  // Automatically dismiss success notification after 3.5 seconds
  useEffect(() => {
    if (!saveMessage) return
    const timer = setTimeout(() => {
      setSaveMessage("")
    }, 3500)
    return () => clearTimeout(timer)
  }, [saveMessage])

  // Automatically dismiss error notification after 5 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => {
      setError("")
    }, 5000)
    return () => clearTimeout(timer)
  }, [error])

  // Compute initials
  const initials = (fullName || account?.full_name || "Admin")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  // =========================================
  // PHOTO HANDLERS
  // =========================================

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(t("authSelectImageFile") || "Please select a valid image file.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setProfilePhoto(reader.result)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const handleDeletePhoto = async () => {
    setError("")
    try {
      const updated = await updateAccountProfilePhoto(null)
      setProfilePhoto("")
      setAccount(updated)
      mergeAccountIntoStoredUser(updated)
      window.dispatchEvent(new Event("adminProfileUpdated"))
      setSaveMessage("Profile photo removed successfully.")
    } catch (err) {
      setError(err.message || "Failed to remove photo.")
    }
  }

  // =========================================
  // EMAIL SAVE HANDLER
  // =========================================

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
      window.dispatchEvent(new Event("adminProfileUpdated"))

      try {
        const rem = loadRememberedLogin()
        if (rem?.email) {
          persistRememberedLogin({ ...rem, email: cleanEmail })
        }
      } catch {
        /* ignore */
      }

      setSaveMessage("Email updated successfully. Please use your new email for future logins.")
      setIsEditingEmail(false)
    } catch (err) {
      setError(localizeApiError(t, err.message) || err.message || "Failed to update email.")
    } finally {
      setEmailLoading(false)
    }
  }

  // =========================================
  // GENERAL PROFILE SAVE
  // =========================================

  const handleSave = async (e) => {
    e?.preventDefault()
    setSaveMessage("")
    setError("")
    setSaving(true)

    try {
      const updated = await updateAccountProfile({
        fullName: fullName.trim(),
        displayName: displayName.trim(),
      })

      let accountWithPhoto = updated
      if (profilePhoto && profilePhoto.startsWith("data:image/")) {
        accountWithPhoto = await updateAccountProfilePhoto(profilePhoto)
      } else if (profilePhoto === "") {
        accountWithPhoto = await updateAccountProfilePhoto(null)
      }

      setAccount(accountWithPhoto)
      setFullName(accountWithPhoto.full_name || "")
      setDisplayName(accountWithPhoto.display_name || accountWithPhoto.full_name || "")
      const savedPhoto = accountWithPhoto.preferences?.profile_photo_data_url
      setProfilePhoto(typeof savedPhoto === "string" ? savedPhoto : "")

      mergeAccountIntoStoredUser(accountWithPhoto)
      window.dispatchEvent(new Event("adminProfileUpdated"))
      setSaveMessage("Profile details saved successfully.")
    } catch (err) {
      setError(err.message || "Unable to save profile changes.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-profile-page">
        <div className="admin-profile-loading-state">
          <span className="spinner-inline" /> {t("adminProfileLoading") || "Loading profile..."}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-profile-page">

      {/* Page Header */}
      <div className="admin-profile-page-header">
        <div className="admin-profile-header-titles">
          <span className="admin-profile-eyebrow">ADMINISTRATION CONTROL PANEL</span>
          <h1>Administrator Profile & Credentials</h1>
          <p className="admin-profile-subhead">
            Manage your personal profile details, contact email, avatar image, and inspect administrative permissions and account security.
          </p>
        </div>
      </div>

      {/* Global Auto-Dismissing Alert Banners */}
      {error && (
        <div className="admin-profile-alert error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
          <button type="button" className="alert-close" onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      {saveMessage && (
        <div className="admin-profile-alert success" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>{saveMessage}</span>
          <button type="button" className="alert-close" onClick={() => setSaveMessage("")} aria-label="Dismiss success message">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="admin-profile-tabs" aria-label="Profile categories">
        <button
          type="button"
          className={`admin-profile-tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <UserTabIcon />
          <span>Profile Information</span>
        </button>

        <button
          type="button"
          className={`admin-profile-tab ${activeTab === "permissions" ? "active" : ""}`}
          onClick={() => setActiveTab("permissions")}
        >
          <ShieldTabIcon />
          <span>Authority & Permissions</span>
          <span className="profile-active-pill">Active</span>
        </button>

        <button
          type="button"
          className={`admin-profile-tab ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <SecurityTabIcon />
          <span>Session & Security</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE INFORMATION */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="admin-profile-tab-panel">

          {/* Profile Photo Card */}
          <div className="admin-profile-card">
            <div className="admin-profile-card-header">
              <div>
                <h2>Profile Photo</h2>
                <p>Customize your avatar displayed across the admin workspace header and audit logs.</p>
              </div>
            </div>

            <div className="admin-profile-photo-row">
              <div className="admin-profile-avatar-wrapper">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Administrator avatar"
                    className="admin-profile-avatar-img"
                  />
                ) : (
                  <div className="admin-profile-avatar-initials">
                    {initials}
                  </div>
                )}
              </div>

              <div className="admin-profile-photo-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handlePhotoChange}
                />

                <div className="photo-btn-group">
                  <button
                    type="button"
                    className="admin-profile-btn-accent"
                    onClick={handlePhotoClick}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {profilePhoto ? "Change Photo" : "Upload Photo"}
                  </button>

                  {profilePhoto && (
                    <button
                      type="button"
                      className="admin-profile-btn-danger-outline"
                      onClick={handleDeletePhoto}
                    >
                      Delete Photo
                    </button>
                  )}
                </div>

                <span className="photo-help-text">
                  Recommended: Square JPG or PNG, max 2MB.
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information Form Card */}
          <div className="admin-profile-card">
            <div className="admin-profile-card-header">
              <div>
                <h2>Personal & Contact Information</h2>
                <p>Update your full name, display nickname, and registered administrator email address.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="admin-profile-form-grid">
              <div className="profile-field-group">
                <label htmlFor="adminFullName">Full Legal Name</label>
                <input
                  id="adminFullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="admin-profile-input"
                  required
                />
                <span className="profile-field-hint">Used for official communications and audit records.</span>
              </div>

              <div className="profile-field-group">
                <label htmlFor="adminDisplayName">Display Name / Title</label>
                <input
                  id="adminDisplayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Admin Rajesh"
                  className="admin-profile-input"
                />
                <span className="profile-field-hint">Displayed in the navigation bar and editor credits.</span>
              </div>

              {/* Email Address Section with Inline Change Email */}
              <div className="profile-field-group full-width">
                <div className="field-header-row">
                  <label htmlFor="adminEmailInput">Email Address</label>
                  {!isEditingEmail && (
                    <button
                      type="button"
                      className="change-email-pill-btn"
                      onClick={() => {
                        setNewEmail(account?.email || "")
                        setIsEditingEmail(true)
                        setError("")
                        setSaveMessage("")
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Change Email
                    </button>
                  )}
                </div>

                {!isEditingEmail ? (
                  <div className="admin-profile-readonly-box">
                    <span>{account?.email || "admin@dravyaguna.org"}</span>
                    <span className="verified-pill">Verified Login</span>
                  </div>
                ) : (
                  <div className="inline-email-editor">
                    <input
                      id="adminEmailInput"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new administrator email"
                      disabled={emailLoading}
                      className="admin-profile-input"
                      autoFocus
                    />
                    <div className="inline-email-actions">
                      <button
                        type="button"
                        className="admin-profile-btn-primary small"
                        disabled={emailLoading}
                        onClick={handleEmailSave}
                      >
                        {emailLoading ? "Saving Email..." : "Save Email"}
                      </button>
                      <button
                        type="button"
                        className="admin-profile-btn-secondary small"
                        disabled={emailLoading}
                        onClick={() => {
                          setIsEditingEmail(false)
                          setNewEmail(account?.email || "")
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <span className="profile-field-hint">
                  Your email is your sign-in identifier and receives verification reviews and password resets.
                </span>
              </div>

              {/* Form Action Footer */}
              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="admin-profile-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTHORITY & PERMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === "permissions" && (
        <div className="admin-profile-tab-panel">

          {/* Authority Summary Cards */}
          <div className="authority-kpi-grid">
            <div className="authority-kpi-card">
              <span className="kpi-label">ACCOUNT STATUS</span>
              <div className="kpi-value-row">
                <span className="status-dot active" />
                <strong className="kpi-main-number">{account?.status || "Active"}</strong>
              </div>
              <span className="kpi-subtext">Verified administrator account</span>
            </div>

            <div className="authority-kpi-card">
              <span className="kpi-label">SYSTEM ROLE</span>
              <strong className="kpi-role-badge">
                {account?.role ? account.role.toUpperCase() : "ADMIN"}
              </strong>
              <span className="kpi-subtext">Highest tier platform privilege</span>
            </div>

            <div className="authority-kpi-card">
              <span className="kpi-label">ACCESS LEVEL</span>
              <strong className="kpi-main-number">Full Access</strong>
              <span className="kpi-subtext">Global read, write, export & delete</span>
            </div>

            <div className="authority-kpi-card">
              <span className="kpi-label">WORKSPACE REALM</span>
              <strong className="kpi-main-number">Dravyaguna</strong>
              <span className="kpi-subtext">Ayurvedic Clinical Knowledgebase</span>
            </div>
          </div>

          {/* Permissions Checklist Card */}
          <div className="admin-profile-card">
            <div className="admin-profile-card-header">
              <div>
                <h2>Authorized Capabilities & Modules</h2>
                <p>System rights granted to this administrator profile across the Dravyaguna portal.</p>
              </div>
            </div>

            <div className="permissions-grid">
              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Manage Herbs Directory</strong>
                  <span>Full CRUD authority over botanical records, synonyms, and images.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Add & Edit Botanical Entries</strong>
                  <span>Create new herbs with complete Rasa, Guna, Virya, and Vipaka profiles.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Sanskrit & Regional Vocabulary</strong>
                  <span>Review clinician-submitted synonyms and approve multilingual mappings.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Clinical Scoring & Weights</strong>
                  <span>Adjust algorithmic ranking multipliers for dosha, karma, and rogaghnata.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Search Insights & Analytics</strong>
                  <span>Inspect clinical query volumes, zero-result searches, and clinician usage.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>User & Role Management</strong>
                  <span>Provision clinician accounts, elevate domain experts, and manage bans.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Audit Trail Inspection</strong>
                  <span>Review cryptographic activity logs and traceability timestamps.</span>
                </div>
              </div>

              <div className="permission-item">
                <div className="permission-icon-wrap"><CheckIcon /></div>
                <div>
                  <strong>Self-Learning AI Model Controls</strong>
                  <span>Tune Bayesian reinforcement weights and initiate training cycles.</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SESSION & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === "security" && (
        <div className="admin-profile-tab-panel">

          <div className="admin-profile-card">
            <div className="admin-profile-card-header">
              <div>
                <h2>Authentication Session Overview</h2>
                <p>Security posture and credentials configuration for this administrator login.</p>
              </div>
            </div>

            <div className="security-summary-grid">
              <div className="security-summary-item">
                <span className="summary-label">CURRENT EMAIL</span>
                <strong className="summary-value">{account?.email || "admin@dravyaguna.org"}</strong>
                <span className="summary-note">Primary login identifier</span>
              </div>

              <div className="security-summary-item">
                <span className="summary-label">PASSWORD ENCRYPTION</span>
                <strong className="summary-value">Bcrypt Salted Hash</strong>
                <span className="summary-note">Secured in Supabase database</span>
              </div>

              <div className="security-summary-item">
                <span className="summary-label">SESSION REFRESH</span>
                <strong className="summary-value">7 Days JWT</strong>
                <span className="summary-note">Secure HTTP-only credential storage</span>
              </div>

              <div className="security-summary-item">
                <span className="summary-label">SECURITY AUDIT</span>
                <strong className="summary-value">Active & Logged</strong>
                <span className="summary-note">All logins recorded in audit log</span>
              </div>
            </div>

            <div className="admin-profile-card-footer">
              <button
                type="button"
                className="admin-profile-btn-accent"
                onClick={() => navigate("/admin/settings")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Manage Password & Security in Admin Settings
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
