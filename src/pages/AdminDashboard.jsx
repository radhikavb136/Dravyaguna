import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { listAllHerbs } from "../api/herbs"
import { localizeApiError } from "../i18n/localizeApiError"
import { formatRelativeTime } from "../i18n/relativeTime"
import { useUiText } from "../i18n/useUiText"
import InfoTooltip from "../components/InfoTooltip"
import "../styles/AdminDashboard.css"

function AdminDashboard() {
  const t = useUiText()
  const navigate = useNavigate()

  const [herbs, setHerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // =====================================================
  // LOAD REAL HERB DATA
  // =====================================================

  const loadHerbs = async () => {
    setLoading(true)
    setError(null)
    try {
        const allHerbs = await listAllHerbs({ limit: 200 })
      setHerbs(allHerbs)
    } catch (error) {
      console.error("Failed to load herbs:", error)
      setError(localizeApiError(t, error.message || t("adminDashLoadError")))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHerbs()
  }, [])

  // =====================================================
  // REAL DASHBOARD STATISTICS
  // =====================================================

  const totalHerbs = herbs.length

  const verifiedHerbs = herbs.filter(
    (herb) =>
    String(herb.verificationStatus).toLowerCase() === "verified"
  ).length

  const reviewedHerbs = herbs.filter(
    (herb) =>
    String(herb.verificationStatus).toLowerCase() === "reviewed"
  ).length

  const draftHerbs = herbs.filter(
    (herb) =>
      !herb.verificationStatus ||
      String(herb.verificationStatus).toLowerCase() === "draft"
  ).length

  const verifiedPercentage =
    totalHerbs > 0
      ? Math.round(
          (verifiedHerbs / totalHerbs) * 100
        )
      : 0

  const reviewedPercentage =
    totalHerbs > 0
      ? Math.round(
          (reviewedHerbs / totalHerbs) * 100
        )
      : 0

  const draftPercentage =
    totalHerbs > 0
      ? Math.round(
          (draftHerbs / totalHerbs) * 100
        )
      : 0

  // =====================================================
  // DATA QUALITY
  // =====================================================

  const pendingVerification = reviewedHerbs

  const missingAyurvedicParameters = herbs.filter(
    (herb) => {
      const missingRasa =
        !Array.isArray(herb.rasa) ||
        herb.rasa.length === 0

      const missingGuna =
        !Array.isArray(herb.guna) ||
        herb.guna.length === 0

      const missingVirya =
        !herb.virya

      const missingVipaka =
        !herb.vipaka

      return (
        missingRasa ||
        missingGuna ||
        missingVirya ||
        missingVipaka
      )
    }
  ).length

  // Active vocabulary conflicts can be calculated
  // from the real vocabulary dataset.

  const vocabularyConflicts = useMemo(() => {
    return null
  }, [])

  // =====================================================
  // RECENT HERB ACTIVITY
  // =====================================================

  const recentHerbs = useMemo(() => {
    return [...herbs]
      .sort((a, b) => {
        const dateA = new Date(
          a.updatedAt ||
          a.savedAt ||
          0
        ).getTime()

        const dateB = new Date(
          b.updatedAt ||
          b.savedAt ||
          0
        ).getTime()

        return dateB - dateA
      })
      .slice(0, 4)
  }, [herbs])

  if (loading) return <p role="status">{t("adminDashLoading")}</p>
  if (error) return <p role="alert">{error}</p>


  // =====================================================
  // ACTIVITY DESCRIPTION
  // =====================================================

  const getActivityDescription = (herb) => {
    const history =
      herb.verificationHistory || []

    const lastHistory =
      history.length > 0
        ? history[history.length - 1]
        : null

    if (lastHistory) {
      if (
        lastHistory.newStatus === "Verified"
      ) {
        return "Profile verified"
      }

      if (
        lastHistory.newStatus === "Reviewed"
      ) {
        return "Profile reviewed"
      }

      if (
        lastHistory.newStatus === "Draft"
      ) {
        return "Profile saved as draft"
      }
    }

    if (herb.updatedAt) {
      return "Profile updated"
    }

    return "Herb profile added"
  }

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  const getActivityIcon = (herb) => {
    const status =
      herb.verificationStatus

    if (status === "Verified") {
      return "✓"
    }

    if (status === "Reviewed") {
      return "◉"
    }

    return "✦"
  }

  // =====================================================
  // QUICK QUALITY ALERTS
  // =====================================================

  const qualityAlerts = [
    {
      title: t("adminDashPendingVerification"),
      description: t("adminDashAlertVerifyDesc"),
      count: pendingVerification,
      type: "warning",
    },
    {
      title: t("adminDashMissingParams"),
      description: t("adminDashAlertParamsDesc"),
      count: missingAyurvedicParameters,
      type: "warning",
    },
    {
      title: t("adminDashAlertVocabTitle"),
      description: t("adminDashAlertVocabDesc"),
      count: vocabularyConflicts,
      type: "warning",
    },
  ]

  const activeAlerts =
    qualityAlerts.filter(
      (alert) => alert.count > 0
    )

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =========================
          PAGE HEADING
      ========================= */}

      <div className="admin-page-heading">

        <h1>
          {t("adminDashTitle")}
        </h1>

        <p>
          {t("adminDashSubtitle")}
        </p>

      </div>


      {/* =========================
          OVERVIEW STATISTICS
      ========================= */}

      <section className="admin-stats-grid">

        {/* TOTAL HERBS */}

        <div className="admin-stat-card">

          <div className="admin-stat-number">
            {totalHerbs}
          </div>

          <div className="admin-stat-title">
            {t("adminDashTotalHerbs")}
            <InfoTooltip contentKey="totalHerbs" />
          </div>

          <div className="admin-stat-description">
            Structured herb profiles
          </div>

        </div>


        {/* VERIFIED */}

        <div className="admin-stat-card">

          <div className="admin-stat-number verified">
            {verifiedHerbs}
          </div>

          <div className="admin-stat-title">
            {t("adminDashVerified")}
            <InfoTooltip title="Verified Herbs" text="Herbs that have completed expert review and are verified for clinical consultation." />
          </div>

          <div className="admin-stat-description">
            Ready for clinical search
          </div>

        </div>


        {/* REVIEWED */}

        <div className="admin-stat-card">

          <div className="admin-stat-number pending">
            {reviewedHerbs}
          </div>

          <div className="admin-stat-title">
            {t("adminDashReviewed")}
            <InfoTooltip contentKey="reviewedHerbs" />
          </div>

          <div className="admin-stat-description">
            Reviewed and awaiting verification
          </div>

        </div>


        {/* DRAFT */}

        <div className="admin-stat-card">

          <div className="admin-stat-number draft">
            {draftHerbs}
          </div>

          <div className="admin-stat-title">
            {t("adminDashDraft")}
            <InfoTooltip contentKey="draftHerbs" />
          </div>

          <div className="admin-stat-description">
            Incomplete or unpublished
          </div>

        </div>

      </section>


      {/* =========================
          VERIFICATION + DATA QUALITY
      ========================= */}

      <section className="admin-overview-grid">

        {/* VERIFICATION OVERVIEW */}

        <div className="admin-panel">

          <div className="admin-panel-header">

            <div>

              <p className="admin-panel-label">
                KNOWLEDGE BASE
              </p>

              <h2>
                Verification Overview
                <InfoTooltip title="Verification Status" text="Progress breakdown of botanical entries verified, awaiting review, or currently drafted." />
              </h2>

            </div>

            <span className="admin-panel-total">
              {totalHerbs} herbs
            </span>

          </div>


          <div className="verification-list">

            {/* VERIFIED */}

            <div className="verification-item">

              <div className="verification-item-top">

                <span>
                  Verified
                </span>

                <strong>
                  {verifiedHerbs}
                </strong>

              </div>

              <div className="verification-progress">

                <div
                  className="verification-progress-fill verified-fill"
                  style={{
                    width: `${verifiedPercentage}%`,
                  }}
                />

              </div>

              <span className="verification-percentage">
                {verifiedPercentage}%
              </span>

            </div>


            {/* REVIEWED */}

            <div className="verification-item">

              <div className="verification-item-top">

                <span>
                  Reviewed
                </span>

                <strong>
                  {reviewedHerbs}
                </strong>

              </div>

              <div className="verification-progress">

                <div
                  className="verification-progress-fill reviewed-fill"
                  style={{
                    width: `${reviewedPercentage}%`,
                  }}
                />

              </div>

              <span className="verification-percentage">
                {reviewedPercentage}%
              </span>

            </div>


            {/* DRAFT */}

            <div className="verification-item">

              <div className="verification-item-top">

                <span>
                  Draft
                </span>

                <strong>
                  {draftHerbs}
                </strong>

              </div>

              <div className="verification-progress">

                <div
                  className="verification-progress-fill draft-fill"
                  style={{
                    width: `${draftPercentage}%`,
                  }}
                />

              </div>

              <span className="verification-percentage">
                {draftPercentage}%
              </span>

            </div>

          </div>

        </div>


        {/* DATA QUALITY ALERTS */}

        <div className="admin-panel">

          <div className="admin-panel-header">

            <div>

              <p className="admin-panel-label">
                DATA QUALITY
              </p>

              <h2>
                Data Quality Alerts
                <InfoTooltip title="Data Quality Alerts" text="Monitors missing Ayurvedic parameters (Rasa, Guna, Virya, Vipaka) or unverified botanical records." />
              </h2>

            </div>

            <span className="alert-count">
              {activeAlerts.length} alerts
            </span>

          </div>


          <div className="quality-alert-list">

            {qualityAlerts.map((alert) => (

              <div
                className="quality-alert"
                key={alert.title}
              >

                <div
                  className={`quality-alert-icon ${alert.type}`}
                >
                  !
                </div>

                <div className="quality-alert-content">

                  <strong>
                    {alert.title}
                  </strong>

                  <span>
                    {alert.description}
                  </span>

                </div>

                <span className="quality-alert-count">
                  {alert.count}
                </span>

              </div>

            ))}

          </div>


          <button
            type="button"
            className="view-alerts-button"
            onClick={() =>
              navigate("/admin/manage-herbs")
            }
          >
            View all alerts →
          </button>

        </div>

      </section>


      {/* =========================
          RECENT ACTIVITY
      ========================= */}

      <section className="admin-recent-grid">

        {/* RECENT HERB ACTIVITY */}

        <div className="admin-panel admin-recent-panel">

          <div className="admin-panel-header">

            <div>

              <p className="admin-panel-label">
                HERB ACTIVITY
              </p>

              <h2>
                Recent Herb Activity
                <InfoTooltip contentKey="recentActivity" />
              </h2>

            </div>

            <button
              type="button"
              className="admin-view-all-button"
              onClick={() =>
                navigate("/admin/manage-herbs")
              }
            >
              View all →
            </button>

          </div>


          <div className="admin-activity-list">

            {recentHerbs.length > 0 ? (

              recentHerbs.map((herb) => (

                <div
                  className="admin-activity-item"
                  key={herb.id}
                >

                  <div className="admin-activity-icon">
                    {getActivityIcon(herb)}
                  </div>

                  <div className="admin-activity-content">

                    <strong>
                    {herb.englishName ||
                        herb.sanskritName ||
                        "Unnamed Herb"}
                    </strong>

                    <span>
                      {getActivityDescription(herb)}
                    </span>

                  </div>

                  <span
                    className={`admin-activity-status ${
                      herb.verificationStatus ===
                      "Verified"
                        ? "verified-status"
                        : herb.verificationStatus ===
                          "Reviewed"
                        ? "reviewed-status"
                        : "draft-status"
                    }`}
                  >
                    {herb.verificationStatus ||
                      "Draft"}
                  </span>

                  <span className="admin-activity-time">
                    {formatRelativeTime(
                      t,
                      herb.updatedAt ||
                        herb.savedAt
                    )}
                  </span>

                </div>

              ))

            ) : (

              <div className="admin-empty-state">
                No herb activity yet.
              </div>

            )}

          </div>

        </div>


        {/* RECENT SEARCH ACTIVITY */}

        <div className="admin-panel admin-recent-panel">

          <div className="admin-panel-header">

            <div>

              <p className="admin-panel-label">
                SEARCH ACTIVITY
              </p>

              <h2>
                Recent Search Activity
              </h2>

            </div>

            <button
              type="button"
              className="admin-view-all-button"
              onClick={() =>
                navigate(
                  "/admin/search-analytics"
                )
              }
            >
              View all →
            </button>

          </div>


          <div className="admin-search-activity-list">

            <div className="admin-empty-state">
              Search activity will appear here
              once search analytics are connected.
            </div>

          </div>

        </div>

      </section>


      {/* =========================
          QUICK ACTIONS
      ========================= */}

      <section className="admin-quick-actions-section">

        <div className="admin-panel admin-quick-actions-panel">

          <div className="admin-panel-header">

            <div>

              <h2>
                {t("adminDashQuickActions")}
              </h2>

            </div>

          </div>


          <div className="admin-quick-actions-grid">

            <button
              type="button"
              className="admin-quick-action primary"
              onClick={() =>
                navigate("/admin/add-herb")
              }
            >
              <span>＋</span>

              <strong>
                {t("adminDashAddHerbLink")}
              </strong>
            </button>


            <button
              type="button"
              className="admin-quick-action"
              onClick={() =>
                navigate("/admin/manage-herbs")
              }
            >
              <span>♧</span>

              <strong>
                Review Pending Herbs
              </strong>
            </button>


            <button
              type="button"
              className="admin-quick-action"
              onClick={() =>
                navigate("/admin/vocabulary")
              }
            >
              <span>▣</span>

              <strong>
                Manage Vocabulary
              </strong>
            </button>


            <button
              type="button"
              className="admin-quick-action"
              onClick={() =>
                navigate(
                  "/admin/search-analytics"
                )
              }
            >
              <span>⌁</span>

              <strong>
                {t("adminDashViewAnalytics")}
              </strong>
            </button>

          </div>

        </div>

      </section>

    </>
  )
}

export default AdminDashboard
