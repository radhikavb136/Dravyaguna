import { useCallback, useEffect, useState } from "react"
import { listSupportRequests, updateSupportRequestStatus } from "../api/support"
import { localizeApiError } from "../i18n/localizeApiError"
import { formatRelativeTime } from "../i18n/relativeTime"
import { useUiText } from "../i18n/useUiText"
import "../styles/AdminSupportRequests.css"

const PAGE_SIZE = 20
const STATUSES = ["open", "in_progress", "resolved", "closed"]

function topicLabel(t, topic) {
  const map = {
    search: "helpContactTopicSearch",
    herb: "helpContactTopicHerb",
    account: "helpContactTopicAccount",
    billing: "helpContactTopicBilling",
    technical: "helpContactTopicTechnical",
    other: "helpContactTopicOther",
  }
  const key = map[topic]
  return key ? t(key) : topic
}

function statusLabel(t, status) {
  const map = {
    open: "adminSupportStatusOpen",
    in_progress: "adminSupportStatusInProgress",
    resolved: "adminSupportStatusResolved",
    closed: "adminSupportStatusClosed",
  }
  const key = map[status]
  return key ? t(key) : status
}

function AdminSupportRequestsPage() {
  const t = useUiText()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [updatingId, setUpdatingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const offset = (page - 1) * PAGE_SIZE
      const response = await listSupportRequests({ limit: PAGE_SIZE, offset })
      setRows(response.data || [])
      const pagination = response.pagination || {}
      setTotal(pagination.total ?? 0)
      setTotalPages(pagination.totalPages ?? 1)
    } catch (err) {
      setError(localizeApiError(t, err.message) || t("adminSupportLoadError"))
      // Don't clear rows on error - keep previous data or leave empty
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusChange = async (requestId, status) => {
    setUpdatingId(requestId)
    setError("")
    try {
      await updateSupportRequestStatus(requestId, status)
      await load()
    } catch (err) {
      setError(localizeApiError(t, err.message) || t("adminSupportUpdateError"))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="admin-support-page">
      <header className="admin-support-header">
        <p className="admin-support-label">{t("adminSupportLabel")}</p>
        <h1>{t("adminSupportTitle")}</h1>
        <p>{t("adminSupportSubtitle")}</p>
        <p className="admin-support-note" role="note">{t("adminSupportEmailNote")}</p>
      </header>

      {error && <p className="admin-support-error" role="alert">{error}</p>}

      {loading ? (
        <p role="status">{t("adminSupportLoading")}</p>
      ) : error ? (
        <button
          type="button"
          className="admin-support-retry"
          onClick={load}
        >
          {t("adminSupportRetry")}
        </button>
      ) : rows.length === 0 ? (
        <p role="status">{t("adminSupportEmpty")}</p>
      ) : (
        <>
          <div className="admin-support-table-wrap">
            <table className="admin-support-table">
              <thead>
                <tr>
                  <th>{t("adminSupportColSubmitted")}</th>
                  <th>{t("adminSupportColUser")}</th>
                  <th>{t("adminSupportColTopic")}</th>
                  <th>{t("adminSupportColStatus")}</th>
                  <th>{t("adminSupportColMessage")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span title={new Date(row.created_at).toLocaleString()}>
                        {formatRelativeTime(t, row.created_at)}
                      </span>
                    </td>
                    <td>
                      <strong>{row.user_full_name || "—"}</strong>
                      <br />
                      <span className="admin-support-email">{row.user_email}</span>
                    </td>
                    <td>{topicLabel(t, row.topic)}</td>
                    <td>
                      <select
                        value={row.status}
                        disabled={updatingId === row.id}
                        onChange={(event) =>
                          handleStatusChange(row.id, event.target.value)
                        }
                        aria-label={t("adminSupportColStatus")}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(t, status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="admin-support-message">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-support-pagination">
            <span>
              {t("adminSupportPageSummary", {
                page: String(page),
                totalPages: String(totalPages),
                total: String(total),
              })}
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("adminSupportPrev")}
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("adminSupportNext")}
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}

export default AdminSupportRequestsPage
