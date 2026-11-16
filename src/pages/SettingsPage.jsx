import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { changeAccountPassword, getAccount, updateAccountPreferences } from "../api/account"

import DashboardNavbar from "../components/DashboardNavbar"
import PageBack from "../components/PageBack"
import Sidebar from "../components/Sidebar"

import "../styles/SettingsPage.css"
import { localizeApiError } from "../i18n/localizeApiError"
import { useUiText } from "../i18n/useUiText"

function SettingsPage() {
  const t = useUiText()
  const navigate = useNavigate()
  const useApi = import.meta.env.VITE_USE_API === "true"

  const savedUser = useApi ? null : JSON.parse(localStorage.getItem("herbUser") || "null")

  const [account, setAccount] = useState(savedUser)
  const doctorName = account?.full_name || account?.fullName || t("authRoleDoctor")
  const doctorEmail = account?.email || t("settingsNotAvailable")

  const [activeSetting, setActiveSetting] = useState("account")
  const [searchText, setSearchText] = useState("")

  // Search preferences
  const [defaultSearch, setDefaultSearch] = useState("simple")
  const [resultsPerPage, setResultsPerPage] = useState("20")

  const [verifiedProfiles, setVerifiedProfiles] = useState(true)
  const [showMatchPercentage, setShowMatchPercentage] = useState(true)
  const [showScoringBreakdown, setShowScoringBreakdown] = useState(true)

  // Notifications
  const [searchUpdates, setSearchUpdates] = useState(true)
  const [savedReminders, setSavedReminders] = useState(false)
  const [referenceUpdates, setReferenceUpdates] = useState(true)

  // Clinical preferences
  const [showClassicalReferences, setShowClassicalReferences] =
    useState(true)

  const [showVerificationStatus, setShowVerificationStatus] =
    useState(true)

  const [showClinicalNotes, setShowClinicalNotes] =
    useState(true)

  const [saveMessage, setSaveMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(useApi)

  useEffect(() => {
    if (!useApi) {
      try {
        const preferences = JSON.parse(localStorage.getItem("herbSettings") || "{}")
        setDefaultSearch(preferences.defaultSearch || "simple")
        setResultsPerPage(String(preferences.resultsPerPage || 20))
        setVerifiedProfiles(preferences.verifiedProfiles ?? true)
        setShowMatchPercentage(preferences.showMatchPercentage ?? true)
        setShowScoringBreakdown(preferences.showScoringBreakdown ?? true)
        setSearchUpdates(preferences.searchUpdates ?? true)
        setSavedReminders(preferences.savedReminders ?? false)
        setReferenceUpdates(preferences.referenceUpdates ?? true)
        setShowClassicalReferences(preferences.showClassicalReferences ?? true)
        setShowVerificationStatus(preferences.showVerificationStatus ?? true)
        setShowClinicalNotes(preferences.showClinicalNotes ?? true)
      } catch { /* corrupted browser preferences are ignored in local demo mode */ }
      return
    }
    getAccount().then((user) => {
      setAccount(user)
      const preferences = user.preferences || {}
      setDefaultSearch(preferences.defaultSearch || "simple")
      setResultsPerPage(String(preferences.resultsPerPage || 20))
      setVerifiedProfiles(preferences.verifiedProfiles ?? true)
      setShowMatchPercentage(preferences.showMatchPercentage ?? true)
      setShowScoringBreakdown(preferences.showScoringBreakdown ?? true)
      setSearchUpdates(preferences.searchUpdates ?? true)
      setSavedReminders(preferences.savedReminders ?? false)
      setReferenceUpdates(preferences.referenceUpdates ?? true)
      setShowClassicalReferences(preferences.showClassicalReferences ?? true)
      setShowVerificationStatus(preferences.showVerificationStatus ?? true)
      setShowClinicalNotes(preferences.showClinicalNotes ?? true)
    }).catch((err) => setError(localizeApiError(t, err.message) || t("settingsLoadError"))).finally(() => setLoading(false))
  }, [useApi])

  // =========================================
  // SETTINGS NAVIGATION
  // =========================================

  const settingsItems = [
    {
      id: "account",
      label: t("settingsAccount"),
      icon: "◉"
    },
    {
      id: "privacy",
      label: t("settingsPrivacy"),
      icon: "▣"
    },
    {
      id: "notifications",
      label: t("settingsNotifications"),
      icon: "♧"
    },
    {
      id: "search",
      label: t("settingsSearch"),
      icon: "⌕"
    },
    {
      id: "clinical",
      label: t("settingsClinical"),
      icon: "✦"
    }
  ]

  const filteredItems = settingsItems.filter((item) =>
    item.label
      .toLowerCase()
      .includes(searchText.toLowerCase())
  )

  // =========================================
  // CLOSE SETTINGS
  // =========================================

  const closeSettings = () => {
    navigate("/doctor")
  }

  // =========================================
  // CHANGE EMAIL
  // =========================================

  const handleChangeEmail = () => {
    setError(t("settingsEmailUnavailable"))
  }

  // =========================================
  // CHANGE PASSWORD
  // =========================================

  const handleChangePassword = async () => {
    const currentPassword = window.prompt(t("settingsPromptCurrentPassword"))
    if (currentPassword === null) return
    const newPassword = window.prompt(t("settingsPromptNewPassword"))
    if (newPassword === null) return
    try {
      await changeAccountPassword(currentPassword, newPassword)
      setError("")
      setSaveMessage(t("settingsPasswordUpdated"))
    } catch (err) {
      setError(localizeApiError(t, err.message) || t("settingsChangePasswordFailed"))
    }
  }

  // =========================================
  // SAVE ALL SETTINGS
  // =========================================

  const handleSaveChanges = async () => {
    setError("")
    setSaveMessage("")
    const settings = {
      defaultSearch,
      resultsPerPage: Number(resultsPerPage),
      verifiedProfiles,
      showMatchPercentage,
      showScoringBreakdown,
      searchUpdates,
      savedReminders,
      referenceUpdates,
      showClassicalReferences,
      showVerificationStatus,
      showClinicalNotes
    }

    try {
      if (useApi) await updateAccountPreferences({ preferences: settings })
      else localStorage.setItem("herbSettings", JSON.stringify(settings))
      setSaveMessage(t("settingsSaveSuccess"))
    } catch (err) {
      setError(localizeApiError(t, err.message) || t("settingsSaveFailed"))
    }

    setTimeout(() => {
      setSaveMessage("")
    }, 2500)
  }

  // =========================================
  // PRIVACY
  // =========================================

  const handleClearSearchHistory = () => {
    localStorage.removeItem("searchHistory")
    setSaveMessage(t("settingsClearHistoryDone"))
  }

  // =========================================
  // ACCOUNT
  // =========================================

  const renderAccount = () => (
    <div className="settings-panel-content">

      <div className="settings-panel-title">
        <h2>{t("settingsPanelAccountTitle")}</h2>

        <p>
          {t("settingsPanelAccountDesc")}
        </p>
      </div>

      <div className="settings-form-list">

        {/* FULL NAME */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsPanelFullName")}</strong>

            <span>
              {t("settingsPanelFullNameHint")}
            </span>
          </div>

          <div className="settings-value-box">
            {doctorName}
          </div>

        </div>


        {/* EMAIL */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsPanelEmail")}</strong>

            <span>
              {t("settingsPanelEmailHint")}
            </span>
          </div>

          <div className="settings-account-action">

            <div className="settings-value-box">
              {doctorEmail}
            </div>

            <button
              type="button"
              className="settings-text-button"
              onClick={handleChangeEmail}
            >
              {t("settingsPanelChangeEmail")}
            </button>

          </div>

        </div>


        {/* PROFESSIONAL ROLE */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsPanelRole")}</strong>

            <span>
              {t("settingsPanelRoleHint")}
            </span>
          </div>

          <div className="settings-value-text">
            {t("physician")}
          </div>

        </div>


        {/* PASSWORD */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsPanelPassword")}</strong>

            <span>
              {t("settingsPanelPasswordHint")}
            </span>
          </div>

          <button
            type="button"
            className="settings-text-button"
            onClick={handleChangePassword}
          >
            {t("settingsPanelChangePassword")}
          </button>

        </div>

      </div>

    </div>
  )


  // =========================================
  // PRIVACY
  // =========================================

  const renderPrivacy = () => (
    <div className="settings-panel-content">

      <div className="settings-panel-title">

        <h2>{t("settingsPrivacy")}</h2>

        <p>
          {t("settingsPrivacyDesc")}
        </p>

      </div>

      <div className="settings-form-list">

        {/* SEARCH HISTORY */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsSearchHistory")}</strong>

            <span>
              {t("settingsSearchHistoryHint")}
            </span>
          </div>

          <button
            type="button"
            className="settings-text-button"
            onClick={handleClearSearchHistory}
          >
            {t("settingsClear")}
          </button>

        </div>


        {/* SAVED HERBS */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsSavedHerbs")}</strong>

            <span>
              {t("settingsSavedHerbsHint")}
            </span>
          </div>

          <button
            type="button"
            className="settings-text-button"
            onClick={() => navigate("/favorites")}
          >
            {t("settingsManage")}
          </button>

        </div>


        {/* LOCAL ACTIVITY */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsLocalActivity")}</strong>

            <span>
              {t("settingsLocalActivityHint")}
            </span>
          </div>

          <span className="settings-status-text">
            {t("settingsProtected")}
          </span>

        </div>

      </div>

    </div>
  )


  // =========================================
  // NOTIFICATIONS
  // =========================================

  const renderNotifications = () => (
    <div className="settings-panel-content">

      <div className="settings-panel-title">

        <h2>{t("settingsNotifications")}</h2>

        <p>
          {t("settingsNotificationsDesc")}
        </p>

      </div>

      <div className="settings-form-list">

        {/* SEARCH UPDATES */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsSearchUpdates")}</strong>

            <span>
              {t("settingsSearchUpdatesHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              searchUpdates ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setSearchUpdates(!searchUpdates)
            }
          >
            <span></span>
          </button>

        </div>


        {/* SAVED REMINDERS */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsSavedReminders")}</strong>

            <span>
              {t("settingsSavedRemindersHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              savedReminders ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setSavedReminders(!savedReminders)
            }
          >
            <span></span>
          </button>

        </div>


        {/* REFERENCE UPDATES */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsReferenceUpdates")}</strong>

            <span>
              {t("settingsReferenceUpdatesHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              referenceUpdates ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setReferenceUpdates(!referenceUpdates)
            }
          >
            <span></span>
          </button>

        </div>

      </div>

    </div>
  )


  // =========================================
  // SEARCH PREFERENCES
  // =========================================

  const renderSearchPreferences = () => (
    <div className="settings-panel-content">

      <div className="settings-panel-title">

        <h2>{t("settingsSearchPanelTitle")}</h2>

        <p>
          {t("settingsSearchPanelDesc")}
        </p>

      </div>

      <div className="settings-form-list">

        {/* DEFAULT SEARCH */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsDefaultSearch")}</strong>

            <span>
              {t("settingsDefaultSearchHint")}
            </span>
          </div>

          <select
            value={defaultSearch}
            onChange={(e) =>
              setDefaultSearch(e.target.value)
            }
            className="settings-small-select"
          >

            <option value="simple">
              {t("settingsSimpleSearchOption")}
            </option>

            <option value="detailed">
              {t("settingsDetailedSearchOption")}
            </option>

          </select>

        </div>


        {/* RESULTS PER PAGE */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsResultsPerPage")}</strong>

            <span>
              {t("settingsResultsPerPageHint")}
            </span>
          </div>

          <select
            value={resultsPerPage}
            onChange={(e) =>
              setResultsPerPage(e.target.value)
            }
            className="settings-small-select"
          >

            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>

          </select>

        </div>


        {/* VERIFIED PROFILES */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsVerifiedProfiles")}</strong>

            <span>
              {t("settingsVerifiedProfilesHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              verifiedProfiles ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setVerifiedProfiles(!verifiedProfiles)
            }
          >
            <span></span>
          </button>

        </div>


        {/* MATCH PERCENTAGE */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsShowMatch")}</strong>

            <span>
              {t("settingsShowMatchHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              showMatchPercentage ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setShowMatchPercentage(!showMatchPercentage)
            }
          >
            <span></span>
          </button>

        </div>


        {/* SCORING BREAKDOWN */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsShowScoring")}</strong>

            <span>
              {t("settingsShowScoringHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              showScoringBreakdown ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setShowScoringBreakdown(!showScoringBreakdown)
            }
          >
            <span></span>
          </button>

        </div>

      </div>

    </div>
  )


  // =========================================
  // CLINICAL PREFERENCES
  // =========================================

  const renderClinicalPreferences = () => (
    <div className="settings-panel-content">

      <div className="settings-panel-title">

        <h2>{t("settingsClinicalPanelTitle")}</h2>

        <p>
          {t("settingsClinicalPanelDesc")}
        </p>

      </div>

      <div className="settings-form-list">

        {/* CLASSICAL REFERENCES */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsClassicalRefs")}</strong>

            <span>
              {t("settingsClassicalRefsHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              showClassicalReferences ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setShowClassicalReferences(
                !showClassicalReferences
              )
            }
          >
            <span></span>
          </button>

        </div>


        {/* VERIFICATION STATUS */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsVerificationStatus")}</strong>

            <span>
              {t("settingsVerificationStatusHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              showVerificationStatus ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setShowVerificationStatus(
                !showVerificationStatus
              )
            }
          >
            <span></span>
          </button>

        </div>


        {/* CLINICAL NOTES */}

        <div className="settings-form-row">

          <div>
            <strong>{t("settingsClinicalNotes")}</strong>

            <span>
              {t("settingsClinicalNotesHint")}
            </span>
          </div>

          <button
            className={`settings-toggle ${
              showClinicalNotes ? "on" : ""
            }`}
            type="button"
            onClick={() =>
              setShowClinicalNotes(!showClinicalNotes)
            }
          >
            <span></span>
          </button>

        </div>

      </div>

    </div>
  )


  // =========================================
  // ACTIVE PANEL
  // =========================================

  const renderActivePanel = () => {

    switch (activeSetting) {

      case "privacy":
        return renderPrivacy()

      case "notifications":
        return renderNotifications()

      case "search":
        return renderSearchPreferences()

      case "clinical":
        return renderClinicalPreferences()

      case "account":
      default:
        return renderAccount()
    }

  }


  // =========================================
  // PAGE
  // =========================================

  return (
      <div className="settings-page-layout">

      <DashboardNavbar />

      <div className="settings-page-body">

        <Sidebar />

        <main className="settings-page-content">

          <div className="settings-overlay">

            <div className="settings-modal">
              <PageBack fallback="/doctor" />

              {/* =========================================
                  LEFT SETTINGS NAVIGATION
                  ========================================= */}

              <aside className="settings-modal-sidebar">

                <div className="settings-search">

                  <span className="settings-search-icon">
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder={t("settingsSearchPlaceholder")}
                    value={searchText}
                    onChange={(e) =>
                      setSearchText(e.target.value)
                    }
                  />

                </div>


                <div className="settings-sidebar-label">
                  {t("settingsTitle")}
                </div>


                <nav className="settings-sidebar-nav">

                  {filteredItems.map((item) => (

                    <button
                      key={item.id}
                      type="button"
                      className={`settings-sidebar-item ${
                        activeSetting === item.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveSetting(item.id)
                      }
                    >

                      <span className="settings-sidebar-icon">
                        {item.icon}
                      </span>

                      <span>
                        {item.label}
                      </span>

                    </button>

                  ))}

                </nav>

              </aside>


              {/* =========================================
                  RIGHT SETTINGS CONTENT
                  ========================================= */}

              <section className="settings-modal-main">


                {/* CLOSE BUTTON */}

                <button
                  type="button"
                  className="settings-close-button"
                  onClick={closeSettings}
                  aria-label={t("settingsCloseAria")}
                >
                  ×
                </button>


                {/* =========================================
                    SCROLLABLE CONTENT
                    ========================================= */}

                <div className="settings-scroll-area">

                  {loading && <p role="status">{t("settingsLoading")}</p>}
                  {error && <p role="alert">{error}</p>}

                  {renderActivePanel()}

                </div>


                {/* =========================================
                    FIXED SAVE FOOTER
                    ========================================= */}

                <div className="settings-save-footer">

                  {saveMessage && (
                    <span className="settings-save-message">
                      {saveMessage}
                    </span>
                  )}

                  <button
                    type="button"
                    className="settings-save-button"
                    onClick={handleSaveChanges}
                    disabled={loading}
                  >
                    {t("settingsSaveChanges")}
                  </button>

                </div>

              </section>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default SettingsPage
