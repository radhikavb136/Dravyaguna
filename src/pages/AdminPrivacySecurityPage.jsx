import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAccount, changeAccountPassword } from "../api/account"
import { localizeApiError } from "../i18n/localizeApiError"
import { useUiText } from "../i18n/useUiText"
import "../styles/AdminPrivacySecurityPage.css"

function AdminPrivacySecurityPage() {
  const t = useUiText()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [account, setAccount] = useState(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    getAccount()
      .then((user) => {
        setAccount(user)
      })
      .catch((err) => setError(localizeApiError(t, err.message || t("adminPrivLoadError"))))
      .finally(() => setLoading(false))
  }, [])

  const closePage = () => {
    navigate("/admin")
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError("")
    setSaveMessage("")
    setChangingPassword(true)

    try {
      if (newPassword !== confirmPassword) {
        setPasswordError(t("adminPrivPasswordMismatch"))
        setChangingPassword(false)
        return
      }

      if (newPassword.length < 10) {
        setPasswordError(t("adminPrivPasswordTooShort"))
        setChangingPassword(false)
        return
      }

      await changeAccountPassword(currentPassword, newPassword)
      setSaveMessage(t("adminPrivPasswordChanged"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordError(localizeApiError(t, err.message || t("adminPrivPasswordChangeError")))
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return <p role="status">{t("loading") || "Loading..."}</p>
  }

  return (
    <div className="admin-privacy-security-page">
      <div className="admin-privacy-header">
        <h1>{t("adminPrivTitle")}</h1>
        <p>{t("adminPrivDescription")}</p>
      </div>

      {error && (
        <div className="admin-priv-error" role="alert">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="admin-priv-success" role="status">
          {saveMessage}
        </div>
      )}

      {/* Account Information */}
      <section className="admin-priv-section">
        <div className="admin-priv-section-header">
          <h2>{t("adminPrivAccountInfo")}</h2>
          <p>{t("adminPrivAccountInfoDesc")}</p>
        </div>

        <div className="admin-priv-info">
          <div className="admin-priv-info-item">
            <label>{t("profileEmail")}</label>
            <span>{account?.email || t("settingsNotAvailable")}</span>
          </div>
          <div className="admin-priv-info-item">
            <label>{t("profileFullName")}</label>
            <span>{account?.full_name || t("settingsNotAvailable")}</span>
          </div>
          <div className="admin-priv-info-item">
            <label>{t("authRole")}</label>
            <span>{account?.role || t("settingsNotAvailable")}</span>
          </div>
          <div className="admin-priv-info-item">
            <label>{t("profileStatus")}</label>
            <span>{account?.status || t("settingsNotAvailable")}</span>
          </div>
        </div>
      </section>

      {/* Password Security */}
      <section className="admin-priv-section">
        <div className="admin-priv-section-header">
          <h2>{t("adminPrivPasswordSecurity")}</h2>
          <p>{t("adminPrivPasswordDesc")}</p>
        </div>

        <form onSubmit={handlePasswordChange} className="admin-priv-form">
          <div className="admin-priv-form-field">
            <label htmlFor="current-password">{t("adminPrivCurrentPassword")}</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={changingPassword}
            />
          </div>

          <div className="admin-priv-form-field">
            <label htmlFor="new-password">{t("adminPrivNewPassword")}</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={changingPassword}
            />
          </div>

          <div className="admin-priv-form-field">
            <label htmlFor="confirm-password">{t("adminPrivConfirmPassword")}</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={changingPassword}
            />
          </div>

          {passwordError && (
            <div className="admin-priv-form-error" role="alert">
              {passwordError}
            </div>
          )}

          <button
            type="submit"
            className="admin-priv-submit-button"
            disabled={changingPassword}
          >
            {changingPassword ? t("pleaseWait") : t("adminPrivChangePassword")}
          </button>
        </form>
      </section>

      {/* Privacy Information */}
      <section className="admin-priv-section">
        <div className="admin-priv-section-header">
          <h2>{t("adminPrivDataHandling")}</h2>
          <p>{t("adminPrivDataHandlingDesc")}</p>
        </div>

        <div className="admin-priv-info">
          <div className="admin-priv-info-item">
            <label>{t("adminPrivDataStorage")}</label>
            <span>{t("adminPrivDataStorageDesc")}</span>
          </div>
          <div className="admin-priv-info-item">
            <label>{t("adminPrivDataAccess")}</label>
            <span>{t("adminPrivDataAccessDesc")}</span>
          </div>
          <div className="admin-priv-info-item">
            <label>{t("adminPrivSessionSecurity")}</label>
            <span>{t("adminPrivSessionSecurityDesc")}</span>
          </div>
        </div>
      </section>

      {/* Security Best Practices */}
      <section className="admin-priv-section">
        <div className="admin-priv-section-header">
          <h2>{t("adminPrivBestPractices")}</h2>
          <p>{t("adminPrivBestPracticesDesc")}</p>
        </div>

        <ul className="admin-priv-list">
          <li>{t("adminPrivTip1")}</li>
          <li>{t("adminPrivTip2")}</li>
          <li>{t("adminPrivTip3")}</li>
          <li>{t("adminPrivTip4")}</li>
        </ul>
      </section>
    </div>
  )
}

export default AdminPrivacySecurityPage
