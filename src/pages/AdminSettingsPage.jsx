import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { changeAccountPassword, getAccount, updateAccountPreferences } from "../api/account"
import {
  getModelStatus,
  updateModelConfig,
  trainModel,
  listModelAssociations,
  updateAssociationStatus,
  deleteAssociation,
} from "../api/model"
import { localizeApiError } from "../i18n/localizeApiError"
import { useCurrentLanguage, useUiText } from "../i18n/useUiText"
import { getHerbDisplayName } from "../utils/herbName"
import "../styles/AdminSettingsPage.css"

function GeneralTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ModelTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a4 4 0 0 0-4 4c0 1.6.9 3 2.3 3.6A6 6 0 0 0 4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5a6 6 0 0 0-6.3-5.9C15.1 9 16 7.6 16 6a4 4 0 0 0-4-4z" />
      <path d="M12 12v6" />
      <path d="M9 15h6" />
    </svg>
  )
}

function NotificationsTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function AdminSettingsPage() {
  const t = useUiText()
  const currentLanguage = useCurrentLanguage()
  const navigate = useNavigate()

  // Active Tab
  const [activeTab, setActiveTab] = useState("general")

  // Common UI State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [account, setAccount] = useState(null)

  // Tab 1: General & Workspace Preferences
  const [autoSavePreferences, setAutoSavePreferences] = useState(true)
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState(true)
  const [activityLogging, setActivityLogging] = useState(true)
  const [showPendingChanges, setShowPendingChanges] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [showRecentActivity, setShowRecentActivity] = useState(true)
  const [requireReferences, setRequireReferences] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)

  // Tab 2: Self-Learning AI Model State
  const [modelConfig, setModelConfig] = useState({
    enabled: true,
    learningMode: "continuous",
    sensitivity: "balanced",
    autoSynonyms: true,
    minInteractionThreshold: 1,
  })
  const [modelStatus, setModelStatus] = useState({
    status: "online",
    totalInteractions: 0,
    activeAssociations: 0,
    lastTrainedAt: null,
    sensitivity: "balanced",
    learningMode: "continuous",
  })
  const [associations, setAssociations] = useState([])
  const [associationFilter, setAssociationFilter] = useState("all")
  const [associationsLoading, setAssociationsLoading] = useState(false)
  const [trainingModel, setTrainingModel] = useState(false)
  const [savingModelConfig, setSavingModelConfig] = useState(false)

  // Tab 3: Notification Policies
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [verificationNotifications, setVerificationNotifications] = useState(true)
  const [systemNotifications, setSystemNotifications] = useState(true)
  const [savingNotifications, setSavingNotifications] = useState(false)

  // Tab 4: Security & Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Auto-dismiss alert messages after 3.5s (success) or 5s (error) so users don't have to click the cross
  useEffect(() => {
    if (!saveMessage) return
    const timer = setTimeout(() => setSaveMessage(""), 3500)
    return () => clearTimeout(timer)
  }, [saveMessage])

  useEffect(() => {
    if (!passwordSuccess) return
    const timer = setTimeout(() => setPasswordSuccess(""), 3500)
    return () => clearTimeout(timer)
  }, [passwordSuccess])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(""), 5000)
    return () => clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!passwordError) return
    const timer = setTimeout(() => setPasswordError(""), 5000)
    return () => clearTimeout(timer)
  }, [passwordError])

  // =========================================
  // LOAD INITIAL DATA
  // =========================================

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError("")

      try {
        const [accRes, modelStatusRes] = await Promise.allSettled([
          getAccount(),
          getModelStatus(),
        ])

        if (!cancelled && accRes.status === "fulfilled") {
          const acc = accRes.value
          setAccount(acc)
          const p = acc.preferences || {}
          setAutoSavePreferences(p.autoSavePreferences ?? true)
          setConfirmBeforeDelete(p.confirmBeforeDelete ?? true)
          setActivityLogging(p.activityLogging ?? true)
          setShowPendingChanges(p.showPendingChanges ?? true)
          setShowAnalytics(p.showAnalytics ?? true)
          setShowRecentActivity(p.showRecentActivity ?? true)
          setRequireReferences(p.requireReferences ?? true)
          setEmailNotifications(p.emailNotifications ?? true)
          setVerificationNotifications(p.verificationNotifications ?? true)
          setSystemNotifications(p.systemNotifications ?? true)
        }

        if (!cancelled && modelStatusRes.status === "fulfilled") {
          const m = modelStatusRes.value
          setModelStatus(m)
          setModelConfig({
            enabled: m.status !== "disabled",
            learningMode: m.learningMode || "continuous",
            sensitivity: m.sensitivity || "balanced",
            autoSynonyms: m.autoSynonyms ?? true,
            minInteractionThreshold: m.minInteractionThreshold ?? 1,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(localizeApiError(t, err.message || t("adminSetLoadError")))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [t])

  // Load associations when model tab is opened
  useEffect(() => {
    if (activeTab !== "model") return
    let cancelled = false

    async function fetchAssociations() {
      setAssociationsLoading(true)
      try {
        const res = await listModelAssociations({
          status: associationFilter === "all" ? undefined : associationFilter,
          limit: 100,
        })
        if (!cancelled) {
          setAssociations(res.associations || [])
        }
      } catch (err) {
        console.error("Failed to fetch model associations:", err)
      } finally {
        if (!cancelled) setAssociationsLoading(false)
      }
    }

    fetchAssociations()
    return () => { cancelled = true }
  }, [activeTab, associationFilter])

  // =========================================
  // ACTIONS: GENERAL PREFERENCES
  // =========================================

  const handleSaveGeneral = async (e) => {
    e?.preventDefault()
    setSavingGeneral(true)
    setError("")
    setSaveMessage("")

    try {
      await updateAccountPreferences({
        autoSavePreferences,
        confirmBeforeDelete,
        activityLogging,
        showPendingChanges,
        showAnalytics,
        showRecentActivity,
        requireReferences,
      })
      setSaveMessage(t("adminSetSaveSuccess") || "Workspace preferences saved successfully.")
    } catch (err) {
      setError(localizeApiError(t, err.message || "Failed to save preferences"))
    } finally {
      setSavingGeneral(false)
    }
  }

  // =========================================
  // ACTIONS: SELF-LEARNING AI MODEL
  // =========================================

  const handleSaveModelConfig = async (e) => {
    e?.preventDefault()
    setSavingModelConfig(true)
    setError("")
    setSaveMessage("")

    try {
      const updated = await updateModelConfig({
        enabled: modelConfig.enabled,
        learningMode: modelConfig.learningMode,
        sensitivity: modelConfig.sensitivity,
        autoSynonyms: modelConfig.autoSynonyms,
        minInteractionThreshold: Number(modelConfig.minInteractionThreshold),
      })
      setSaveMessage("Self-learning model configuration updated.")
      const freshStatus = await getModelStatus()
      setModelStatus(freshStatus)
    } catch (err) {
      setError(err.message || "Failed to update model settings")
    } finally {
      setSavingModelConfig(false)
    }
  }

  const handleTrainModel = async () => {
    setTrainingModel(true)
    setError("")
    setSaveMessage("")

    try {
      const res = await trainModel()
      const learnedCount = res.data?.learnedAssociations ?? res.data?.associationsCount ?? 0
      setSaveMessage(`Training cycle completed successfully. Reinforced ${learnedCount} concept association(s).`)
      const [freshStatus, freshAssoc] = await Promise.all([
        getModelStatus(),
        listModelAssociations({ limit: 100 }),
      ])
      setModelStatus(freshStatus)
      setAssociations(freshAssoc.associations || [])
    } catch (err) {
      setError(err.message || "Model training cycle failed.")
    } finally {
      setTrainingModel(false)
    }
  }

  const handleToggleAssociationStatus = async (item) => {
    const nextStatus = item.status === "active" ? "archived" : "active"
    try {
      await updateAssociationStatus(item.id, nextStatus)
      setAssociations((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a))
      )
    } catch (err) {
      setError(err.message || "Failed to update association")
    }
  }

  const handleDeleteAssociation = async (id) => {
    if (!window.confirm("Remove this learned association?")) return
    try {
      await deleteAssociation(id)
      setAssociations((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(err.message || "Failed to delete association")
    }
  }

  // =========================================
  // ACTIONS: NOTIFICATION POLICIES
  // =========================================

  const handleSaveNotifications = async (e) => {
    e?.preventDefault()
    setSavingNotifications(true)
    setError("")
    setSaveMessage("")

    try {
      await updateAccountPreferences({
        emailNotifications,
        verificationNotifications,
        systemNotifications,
      })
      setSaveMessage("Notification policies updated.")
    } catch (err) {
      setError(localizeApiError(t, err.message || "Failed to update notification policies"))
    } finally {
      setSavingNotifications(false)
    }
  }

  // =========================================
  // ACTIONS: PASSWORD & SECURITY
  // =========================================

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t("adminSettingsPasswordFields") || "Please complete all password fields.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("adminPrivPasswordMismatch") || "New passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.")
      return
    }

    setChangingPassword(true)
    try {
      await changeAccountPassword(currentPassword, newPassword)
      setPasswordSuccess(t("adminPrivPasswordChanged") || "Password successfully changed.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordError(localizeApiError(t, err.message || "Failed to change password."))
    } finally {
      setChangingPassword(false)
    }
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <div className="admin-settings-page">

      {/* Page Header */}
      <div className="admin-settings-page-header">
        <div className="admin-settings-header-titles">
          <span className="admin-settings-eyebrow">ADMINISTRATION CONTROL PANEL</span>
          <h1>System Settings & Self-Learning AI Model</h1>
          <p className="admin-settings-subhead">
            Configure platform workspace preferences, tune the continuous self-learning clinical AI relevance model, and manage administrative security.
          </p>
        </div>
      </div>

      {/* Global Banners */}
      {error && (
        <div className="admin-settings-alert error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
          <button type="button" className="alert-close" onClick={() => setError("")}>×</button>
        </div>
      )}

      {saveMessage && (
        <div className="admin-settings-alert success" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>{saveMessage}</span>
          <button type="button" className="alert-close" onClick={() => setSaveMessage("")}>×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="admin-settings-tabs" aria-label="Settings categories">
        <button
          type="button"
          className={`admin-settings-tab ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <GeneralTabIcon />
          <span>General & Workspace</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab ${activeTab === "model" ? "active" : ""}`}
          onClick={() => setActiveTab("model")}
        >
          <ModelTabIcon />
          <span>Self-Learning AI Model</span>
          <span className="model-live-pill">Live</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <NotificationsTabIcon />
          <span>Notification Policies</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <SecurityTabIcon />
          <span>Account & Security</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL & WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === "general" && (
        <div className="admin-settings-tab-panel">
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Workspace Behaviors & Workflow Safeguards</h2>
                <p>Customize confirmation dialogs, audit tracking, and default herb dataset editing preferences.</p>
              </div>
            </div>

            <div className="admin-settings-toggle-list">
              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Confirm Before Deleting Herbs</strong>
                  <span>Display a confirmation safety dialog before any herb record or synonym is removed.</span>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDelete}
                  onChange={(e) => setConfirmBeforeDelete(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Detailed Activity Audit Logging</strong>
                  <span>Record every administrator action, herb modification, and status change into the immutable audit trail.</span>
                </div>
                <input
                  type="checkbox"
                  checked={activityLogging}
                  onChange={(e) => setActivityLogging(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Show Pending Verification Badges</strong>
                  <span>Highlight unverified herbs and vocabulary submissions with a pending review badge across dashboards.</span>
                </div>
                <input
                  type="checkbox"
                  checked={showPendingChanges}
                  onChange={(e) => setShowPendingChanges(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Require Clinical Reference Citations</strong>
                  <span>Mandate Samhita or textbook reference citations when adding or verifying new botanical entries.</span>
                </div>
                <input
                  type="checkbox"
                  checked={requireReferences}
                  onChange={(e) => setRequireReferences(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Search Insights Telemetry</strong>
                  <span>Aggregate anonymous search query frequency to assist Ayurvedic researchers in discovering trending indications.</span>
                </div>
                <input
                  type="checkbox"
                  checked={showAnalytics}
                  onChange={(e) => setShowAnalytics(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Auto-Save Navigation State</strong>
                  <span>Preserve filter and search selections across page transitions in the herb management panel.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSavePreferences}
                  onChange={(e) => setAutoSavePreferences(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>
            </div>

            <div className="admin-settings-card-footer">
              <button
                type="button"
                className="admin-settings-btn-primary"
                onClick={handleSaveGeneral}
                disabled={savingGeneral}
              >
                {savingGeneral ? "Saving Preferences..." : "Save Workspace Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SELF-LEARNING AI MODEL */}
      {/* ========================================================================= */}
      {activeTab === "model" && (
        <div className="admin-settings-tab-panel">

          {/* Model Telemetry Cards */}
          <div className="model-kpi-grid">
            <div className="model-kpi-card">
              <span className="kpi-label">ENGINE STATUS</span>
              <div className="kpi-value-row">
                <span className={`status-dot ${modelConfig.enabled ? "active" : "inactive"}`} />
                <strong className="kpi-main-number">
                  {modelConfig.enabled ? "Online & Active" : "Paused"}
                </strong>
              </div>
              <span className="kpi-subtext">Continuous Reinforcement Mode</span>
            </div>

            <div className="model-kpi-card">
              <span className="kpi-label">TOTAL CLINICAL INTERACTIONS</span>
              <strong className="kpi-main-number">
                {modelStatus.totalInteractions ?? 0}
              </strong>
              <span className="kpi-subtext">Clicks, compares, favorites & prescriptions</span>
            </div>

            <div className="model-kpi-card">
              <span className="kpi-label">LEARNED RELEVANCE CONCEPTS</span>
              <strong className="kpi-main-number">
                {modelStatus.activeAssociations ?? associations.length}
              </strong>
              <span className="kpi-subtext">Query-to-herb reinforced associations</span>
            </div>

            <div className="model-kpi-card">
              <span className="kpi-label">LAST TRAINING CYCLE</span>
              <strong className="kpi-date-value">
                {modelStatus.lastTrainedAt
                  ? new Date(modelStatus.lastTrainedAt).toLocaleString()
                  : "Continuous Active"}
              </strong>
              <span className="kpi-subtext">Automated Bayesian weight adjustment</span>
            </div>
          </div>

          {/* Hyperparameter Settings Card */}
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Self-Learning Relevance Hyperparameters</h2>
                <p>Adjust how clinician interactions reinforce search re-ranking and symptom-herb association scores.</p>
              </div>

              <button
                type="button"
                className="admin-settings-btn-accent"
                onClick={handleTrainModel}
                disabled={trainingModel}
              >
                {trainingModel ? (
                  <>
                    <span className="spinner-inline" /> Retraining Engine...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Retrain Model Now
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSaveModelConfig} className="model-hyperparams-grid">
              <div className="model-field-group">
                <label htmlFor="learning-enabled">Continuous Adaptive Learning</label>
                <div className="field-row">
                  <input
                    id="learning-enabled"
                    type="checkbox"
                    checked={modelConfig.enabled}
                    onChange={(e) => setModelConfig({ ...modelConfig, enabled: e.target.checked })}
                    className="admin-settings-switch"
                  />
                  <span className="field-hint">
                    {modelConfig.enabled
                      ? "Enabled: Search results are dynamically re-ranked using clinician reinforcement signals."
                      : "Disabled: Static BM25 / symptom keyword relevance only."}
                  </span>
                </div>
              </div>

              <div className="model-field-group">
                <label htmlFor="learning-mode">Learning Mode</label>
                <select
                  id="learning-mode"
                  value={modelConfig.learningMode}
                  onChange={(e) => setModelConfig({ ...modelConfig, learningMode: e.target.value })}
                  className="admin-settings-select"
                >
                  <option value="continuous">Continuous Online Learning (Immediate updates)</option>
                  <option value="supervised">Supervised Periodic (Requires admin training cycle)</option>
                </select>
                <span className="field-hint">Defines when clinician feedback updates live relevance weights.</span>
              </div>

              <div className="model-field-group">
                <label htmlFor="model-sensitivity">Relevance Boost Sensitivity</label>
                <select
                  id="model-sensitivity"
                  value={modelConfig.sensitivity}
                  onChange={(e) => setModelConfig({ ...modelConfig, sensitivity: e.target.value })}
                  className="admin-settings-select"
                >
                  <option value="low">Low (Conservative: Requires many signals before boosting)</option>
                  <option value="balanced">Balanced (Recommended: Moderate boost from consistent clicks)</option>
                  <option value="high">High (Aggressive: Swiftly prioritizes frequently viewed herbs)</option>
                </select>
                <span className="field-hint">Controls the magnitude of adaptive bonus added to matched herbs.</span>
              </div>

              <div className="model-field-group">
                <label htmlFor="min-threshold">Minimum Clinical Interaction Threshold</label>
                <input
                  id="min-threshold"
                  type="number"
                  min="1"
                  max="20"
                  value={modelConfig.minInteractionThreshold}
                  onChange={(e) => setModelConfig({ ...modelConfig, minInteractionThreshold: Math.max(1, Number(e.target.value)) })}
                  className="admin-settings-input"
                />
                <span className="field-hint">Minimum number of interactions required before applying a query boost.</span>
              </div>

              <div className="model-field-group full-width">
                <label htmlFor="auto-synonyms">Automatic Clinical Synonym Discovery</label>
                <div className="field-row">
                  <input
                    id="auto-synonyms"
                    type="checkbox"
                    checked={modelConfig.autoSynonyms}
                    onChange={(e) => setModelConfig({ ...modelConfig, autoSynonyms: e.target.checked })}
                    className="admin-settings-switch"
                  />
                  <span className="field-hint">
                    Automatically propose high-confidence query phrases as vocabulary synonyms when clinicians repeatedly select the same herb.
                  </span>
                </div>
              </div>

              <div className="model-form-actions">
                <button
                  type="submit"
                  className="admin-settings-btn-primary"
                  disabled={savingModelConfig}
                >
                  {savingModelConfig ? "Saving Model Settings..." : "Save Model Hyperparameters"}
                </button>
              </div>
            </form>
          </div>

          {/* Learned Query-Herb Associations Card */}
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Learned Concept & Query Associations ({associations.length})</h2>
                <p>Inspect associative relevance pairs formed through clinician queries, selections, and prescriptions.</p>
              </div>

              {/* Status Filter */}
              <div className="assoc-filter-group">
                <button
                  type="button"
                  className={`filter-btn ${associationFilter === "all" ? "active" : ""}`}
                  onClick={() => setAssociationFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`filter-btn ${associationFilter === "active" ? "active" : ""}`}
                  onClick={() => setAssociationFilter("active")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`filter-btn ${associationFilter === "archived" ? "active" : ""}`}
                  onClick={() => setAssociationFilter("archived")}
                >
                  Archived
                </button>
              </div>
            </div>

            {associationsLoading ? (
              <div className="admin-settings-loading-state">
                <span className="spinner-inline" /> Loading learned associations...
              </div>
            ) : associations.length === 0 ? (
              <div className="admin-settings-empty-state">
                <p>No learned associations recorded yet.</p>
                <small>As clinicians search, view, and favorite herbs, the self-learning model will automatically record and reinforce relevance pairs here.</small>
              </div>
            ) : (
              <div className="admin-settings-table-wrapper">
                <table className="admin-settings-table">
                  <thead>
                    <tr>
                      <th>CLINICAL QUERY / SYMPTOM</th>
                      <th>LEARNED TARGET HERB</th>
                      <th>CONFIDENCE</th>
                      <th>SIGNALS</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associations.map((item) => {
                      const confidencePercent = Math.min(100, Math.round((Number(item.confidence_score) || 0) * 100))
                      return (
                        <tr key={item.id}>
                          <td className="cell-query">
                            <strong>{item.query_text}</strong>
                          </td>
                          <td className="cell-herb">
                            <div>
                              <span>{item.herb_name || item.herb_id}</span>
                              {item.botanical_name && (
                                <small className="botanical-text">({item.botanical_name})</small>
                              )}
                            </div>
                          </td>
                          <td className="cell-confidence">
                            <div className="confidence-meter-row">
                              <div className="confidence-track">
                                <div
                                  className="confidence-fill"
                                  style={{
                                    width: `${confidencePercent}%`,
                                    background: confidencePercent > 70 ? "#2d6a4f" : confidencePercent > 40 ? "#52b788" : "#d88a24",
                                  }}
                                />
                              </div>
                              <span className="confidence-number">{confidencePercent}%</span>
                            </div>
                          </td>
                          <td className="cell-signals">
                            <span className="badge-signals">{item.interaction_count || 1}</span>
                          </td>
                          <td className="cell-status">
                            <span className={`status-pill ${item.status || "active"}`}>
                              {item.status || "active"}
                            </span>
                          </td>
                          <td className="cell-actions">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => handleToggleAssociationStatus(item)}
                              title={item.status === "active" ? "Pause association" : "Activate association"}
                            >
                              {item.status === "active" ? "Pause" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn-table-action danger"
                              onClick={() => handleDeleteAssociation(item.id)}
                              title="Delete association"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NOTIFICATION POLICIES */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <div className="admin-settings-tab-panel">
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Administrator Notifications & Broadcast Rules</h2>
                <p>Configure automated system notifications, email summaries, and verification alerts.</p>
              </div>
            </div>

            <div className="admin-settings-toggle-list">
              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Email Notifications</strong>
                  <span>Receive critical system alerts, dataset import confirmations, and weekly analytics digests via email.</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>Herb Verification Review Notifications</strong>
                  <span>Send an instant alert when a new botanical entry or clinical synonym is submitted for peer review.</span>
                </div>
                <input
                  type="checkbox"
                  checked={verificationNotifications}
                  onChange={(e) => setVerificationNotifications(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>

              <label className="admin-settings-toggle-row">
                <div className="toggle-info">
                  <strong>System Health & Diagnostic Alerts</strong>
                  <span>Notify administrators when external translation providers or LLM explain fallback triggers fail.</span>
                </div>
                <input
                  type="checkbox"
                  checked={systemNotifications}
                  onChange={(e) => setSystemNotifications(e.target.checked)}
                  className="admin-settings-switch"
                />
              </label>
            </div>

            <div className="admin-settings-card-footer">
              <button
                type="button"
                className="admin-settings-btn-primary"
                onClick={handleSaveNotifications}
                disabled={savingNotifications}
              >
                {savingNotifications ? "Saving Policies..." : "Save Notification Policies"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACCOUNT & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === "security" && (
        <div className="admin-settings-tab-panel">

          {/* Account Profile Summary */}
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Administrator Identity</h2>
                <p>Authenticated administrator session details and role authority.</p>
              </div>
            </div>

            <div className="admin-identity-grid">
              <div className="identity-item">
                <span className="identity-label">FULL NAME</span>
                <strong className="identity-value">{account?.full_name || "Dravyaguna Administrator"}</strong>
              </div>
              <div className="identity-item">
                <span className="identity-label">EMAIL ADDRESS</span>
                <strong className="identity-value">{account?.email || "admin@dravyaguna.org"}</strong>
              </div>
              <div className="identity-item">
                <span className="identity-label">SECURITY ROLE</span>
                <span className="identity-badge">{account?.role?.toUpperCase() || "ADMIN"}</span>
              </div>
              <div className="identity-item">
                <span className="identity-label">ACCOUNT STATUS</span>
                <span className="identity-status-pill">{account?.status || "Active"}</span>
              </div>
            </div>
          </div>

          {/* Inline Password Change */}
          <div className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <h2>Change Password</h2>
                <p>Update your administrator credentials. Minimum 8 characters required.</p>
              </div>
            </div>

            {passwordError && (
              <div className="admin-settings-alert error inline" role="alert">
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="admin-settings-alert success inline" role="status">
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="admin-password-form">
              <div className="password-field-group">
                <label htmlFor="current-pass">Current Password</label>
                <div className="password-input-wrap">
                  <input
                    id="current-pass"
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="admin-settings-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    aria-label="Toggle current password visibility"
                  >
                    <EyeIcon visible={showCurrentPass} />
                  </button>
                </div>
              </div>

              <div className="password-field-group">
                <label htmlFor="new-pass">New Password</label>
                <div className="password-input-wrap">
                  <input
                    id="new-pass"
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="admin-settings-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPass(!showNewPass)}
                    aria-label="Toggle new password visibility"
                  >
                    <EyeIcon visible={showNewPass} />
                  </button>
                </div>
              </div>

              <div className="password-field-group">
                <label htmlFor="confirm-pass">Confirm New Password</label>
                <div className="password-input-wrap">
                  <input
                    id="confirm-pass"
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="admin-settings-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    aria-label="Toggle confirm password visibility"
                  >
                    <EyeIcon visible={showConfirmPass} />
                  </button>
                </div>
              </div>

              <div className="admin-settings-card-footer no-border">
                <button
                  type="submit"
                  className="admin-settings-btn-primary"
                  disabled={changingPassword}
                >
                  {changingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  )
}
