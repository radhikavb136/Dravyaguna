import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { addAuditLog } from "../utils/auditLogger"
import { listHerbs, verifyHerb, deleteHerb } from "../api/herbs"
import { getCurrentUser } from "../api/auth"
import { getAccount } from "../api/account"
import { canArchiveHerbs, canVerifyHerbs } from "../utils/roles"
import { localizeApiError } from "../i18n/localizeApiError"
import { useCurrentLanguage, useUiText } from "../i18n/useUiText"
import { getHerbDisplayName, isSanskritLanguage } from "../utils/herbName"
import InfoTooltip from "../components/InfoTooltip"
import "../styles/ManageHerbs.css"

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const getDisplayDate = (herb) => {
  const dateValue =
    herb.updatedAt ||
    herb.savedAt ||
    herb.createdAt ||
    herb.lastUpdated

  if (!dateValue) {
    return "—"
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString()
}

const getUpdatedBy = (herb) => {
  return (
    herb.updatedBy ||
    herb.lastUpdatedBy ||
    herb.createdBy ||
    "Admin"
  )
}

/* =========================================================
   DOSHA NORMALIZATION
========================================================= */

const getDoshaValues = (herb) => {
  const values = []

  if (herb.dosha && typeof herb.dosha === "object") {
    if (herb.dosha.vata) {
      values.push(`Vata ${herb.dosha.vata}`)
    }

    if (herb.dosha.pitta) {
      values.push(`Pitta ${herb.dosha.pitta}`)
    }

    if (herb.dosha.kapha) {
      values.push(`Kapha ${herb.dosha.kapha}`)
    }
  }

  if (Array.isArray(herb.dosha)) {
    values.push(...herb.dosha)
  }

  if (typeof herb.dosha === "string") {
    values.push(...toArray(herb.dosha))
  }

  if (Array.isArray(herb.doshaAffinity)) {
    values.push(...herb.doshaAffinity)
  }

  return [...new Set(values.filter(Boolean))]
}

function ManageHerbs() {
  const t = useUiText()
  const currentLanguage = useCurrentLanguage()
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDosha, setSelectedDosha] = useState("")
  const [selectedRasa, setSelectedRasa] = useState("")
  const [selectedGuna, setSelectedGuna] = useState("")
  const [selectedSrotas, setSelectedSrotas] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("All")

  const [herbs, setHerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const useApi = import.meta.env.VITE_USE_API === "true"

  useEffect(() => {
    getAccount()
      .then(({ preferences }) => setConfirmBeforeDelete(preferences?.confirmBeforeDelete ?? true))
      .catch(() => setConfirmBeforeDelete(true))
  }, [])

  /* =========================================================
     LOAD HERBS
  ========================================================= */

  const loadCurrentUser = () => {
    const user = getCurrentUser()
    setCurrentUser(user)
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [selectedStatus, debouncedSearch])

  const loadHerbs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (useApi) {
        const statusFilter = selectedStatus === "All" ? undefined : selectedStatus.toLowerCase()
        const result = await listHerbs({
          page,
          limit: pageSize,
          status: statusFilter,
          q: debouncedSearch || undefined,
        })
        setHerbs(result.data)
        setPagination(result.pagination || { total: 0, totalPages: 1 })
      } else {
        // Fallback to localStorage for mock data
        const savedHerbs = JSON.parse(
          localStorage.getItem("herbs") || "[]"
        )
        setHerbs(Array.isArray(savedHerbs) ? savedHerbs : [])
      }
    } catch (err) {
      console.error('Failed to load herbs:', err)
      const forbidden = err?.status === 403
      setError(forbidden ? (err.message || "You do not have permission to view these herbs.") : localizeApiError(t, err.message || t("manageHerbsLoadError")))
      setHerbs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    loadHerbs()
  }, [selectedStatus, page, debouncedSearch])

  /* =========================================================
     HELPERS
  ========================================================= */


  /* =========================================================
     NORMALIZE HERB DATA
  ========================================================= */

  const normalizedHerbs = useMemo(() => {
    return herbs.map((herb, index) => {
      const rasa = toArray(herb.rasa)
      const guna = toArray(herb.guna)
      const srotas = toArray(herb.srotas)

      const dhatu = toArray(
        herb.dhatu ||
        herb.dhatuAffinity
      )

      const mala = toArray(
        herb.mala ||
        herb.malaAffinity
      )

      const karma = toArray(
        herb.karma ||
        herb.therapeuticActions
      )

      const indications = toArray(
        herb.indications ||
        herb.therapeuticIndications ||
        herb.mainIndications
      )

      const dosha = getDoshaValues(herb)

      return {
        ...herb,

        id:
          herb.id ||
          `herb-${index}`,

        name:
          getHerbDisplayName(herb, currentLanguage) ||
          herb.herbNameEnglish ||
          herb.englishName ||
          herb.commonName ||
          herb.name ||
          "Unnamed Herb",

        botanical:
          herb.botanicalName ||
          herb.botanical_name ||
          "—",

        sanskrit:
          herb.sanskritName ||
          herb.ayurvedicName ||
          herb.sanskrit_name ||
          "—",

        family:
          herb.family ||
          "—",

        rasa,

        guna,

        virya:
          herb.virya ||
          "—",

        vipaka:
          herb.vipaka ||
          "—",

        prabhava:
          toArray(
            herb.prabhava ||
            herb.prabhav
          ),

        dosha,

        dhatu,

        mala,

        srotas,

        avayava:
          toArray(
            herb.avayava ||
            herb.organ ||
            herb.organAffinity
          ),

        karma,

        indications,

        status:
          herb.verificationStatus ||
          "Draft",

        updated:
          getDisplayDate(herb),

        updatedBy:
          getUpdatedBy(herb),
      }
    })
  }, [herbs])

  /* =========================================================
     DYNAMIC FILTER OPTIONS
     ========================================================= */

  const uniqueValues = (items) => {
    return [
      ...new Set(
        items
          .flat()
          .filter(Boolean)
          .map((item) => String(item).trim())
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b)
    )
  }

  const rasaOptions = useMemo(
    () =>
      uniqueValues(
        normalizedHerbs.map(
          (herb) => herb.rasa
        )
      ),
    [normalizedHerbs]
  )

  const gunaOptions = useMemo(
    () =>
      uniqueValues(
        normalizedHerbs.map(
          (herb) => herb.guna
        )
      ),
    [normalizedHerbs]
  )

  const srotasOptions = useMemo(
    () =>
      uniqueValues(
        normalizedHerbs.map(
          (herb) => herb.srotas
        )
      ),
    [normalizedHerbs]
  )

  const doshaOptions = [
    "Vata",
    "Pitta",
    "Kapha",
  ]

  /* =========================================================
     FILTER HERBS
  ========================================================= */

  const filteredHerbs = useMemo(() => {
    const query = useApi ? "" : searchTerm.trim().toLowerCase()

    return normalizedHerbs.filter((herb) => {
      /* SEARCH */

      const searchableText = [
        herb.name,
        herb.botanical,
        herb.sanskrit,
        herb.family,
        ...herb.rasa,
        ...herb.guna,
        ...herb.dosha,
        ...herb.dhatu,
        ...herb.mala,
        ...herb.srotas,
        ...herb.avayava,
        ...herb.karma,
        ...herb.indications,
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch =
        !query ||
        searchableText.includes(query)

      /* DOSHA */

      const matchesDosha =
        selectedDosha === "" ||
        herb.dosha.some((item) =>
          item
            .toLowerCase()
            .startsWith(
              selectedDosha.toLowerCase()
            )
        )

      /* RASA */

      const matchesRasa =
        selectedRasa === "" ||
        herb.rasa.some(
          (item) =>
            item.toLowerCase() ===
            selectedRasa.toLowerCase()
        )

      /* GUNA */

      const matchesGuna =
        selectedGuna === "" ||
        herb.guna.some(
          (item) =>
            item.toLowerCase() ===
            selectedGuna.toLowerCase()
        )

      /* SROTAS */

      const matchesSrotas =
        selectedSrotas === "" ||
        herb.srotas.some(
          (item) =>
            item.toLowerCase() ===
            selectedSrotas.toLowerCase()
        )

      /* STATUS */

      const matchesStatus =
        useApi ||
        selectedStatus === "All" ||
        herb.status === selectedStatus

      return (
        matchesSearch &&
        matchesDosha &&
        matchesRasa &&
        matchesGuna &&
        matchesSrotas &&
        matchesStatus
      )
    })
  }, [
    normalizedHerbs,
    searchTerm,
    useApi,
    selectedDosha,
    selectedRasa,
    selectedGuna,
    selectedSrotas,
    selectedStatus,
  ])

  /* =========================================================
     HERB ACTIONS
  ========================================================= */

  const handleHerbAction = (
    herbId,
    action
  ) => {
    if (!herbId) {
      return
    }

    if (action === "view") {
      navigate(
        `/admin/add-herb?id=${herbId}&mode=view`
      )
    }

    if (action === "edit") {
      navigate(
        `/admin/add-herb?id=${herbId}&mode=edit`
      )
    }

    if (action === "review") {
      navigate(
        `/admin/add-herb?id=${herbId}&mode=review`
      )
    }
  }

  /* =========================================================
     VERIFY HERB (DOMAIN_EXPERT/ADMIN ONLY)
  ========================================================= */

  const handleVerifyHerb = async (herbId) => {
    if (!herbId) {
      return
    }

    const herbToVerify =
      normalizedHerbs.find(
        (herb) =>
          herb.id === herbId
      )

    if (!herbToVerify) {
      return
    }

    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'
      
      if (useApi) {
        // Check if user is domain_expert or admin
        if (!canVerifyHerbs(currentUser)) {
          alert(t("manageHerbsVerifyDenied"))
          return
        }
        
        await verifyHerb(herbId)
        // Reload herbs from API
        await loadHerbs()
      } else {
        // Fallback to localStorage for mock data
        const updatedHerbs = herbs.map(herb => {
          if ((herb.id || `herb-${herbs.indexOf(herb)}`) === herbId) {
            return { ...herb, verificationStatus: 'Verified', status: 'verified' }
          }
          return herb
        })
        localStorage.setItem(
          "herbs",
          JSON.stringify(updatedHerbs)
        )
        setHerbs(updatedHerbs)
      }
      
      if (!useApi) addAuditLog({
        action: "Verified",
        module: "Herb",
        item: herbToVerify.name,
        previous: `Status: ${herbToVerify.status}`,
        newValue: "Verified",
      })
    } catch (err) {
      console.error('Failed to verify herb:', err)
      alert(err.message || t("manageHerbsVerifyError"))
    }
  }

  /* =========================================================
     DELETE HERB (ADMIN ONLY)
  ========================================================= */

  const handleDeleteHerb = async (herbId) => {
    if (!herbId) {
      return
    }

    const herbToDelete =
      normalizedHerbs.find(
        (herb) =>
          herb.id === herbId
      )

    if (!herbToDelete) {
      return
    }

    const confirmed = !confirmBeforeDelete || window.confirm(
      t("manageHerbsArchiveConfirm", { name: herbToDelete.name })
    )

    if (!confirmed) {
      return
    }

    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'
      
      if (useApi) {
        // Check if user is admin
        if (!canArchiveHerbs(currentUser)) {
          alert(t("manageHerbsArchiveDenied"))
          return
        }
        
        await deleteHerb(herbId)
        // Reload herbs from API
        await loadHerbs()
      } else {
        // Fallback to localStorage for mock data
        const updatedHerbs =
          herbs.filter(
            (herb, index) =>
              (herb.id || `herb-${index}`) !==
              herbId
          )
        localStorage.setItem(
          "herbs",
          JSON.stringify(updatedHerbs)
        )
        setHerbs(updatedHerbs)
      }
      
      if (!useApi) addAuditLog({
        action: "Deleted",
        module: "Herb",
        item: herbToDelete.name,
        previous: `Status: ${herbToDelete.status}`,
        newValue: "Deleted",
      })
    } catch (err) {
      console.error('Failed to delete herb:', err)
      alert(err.message || t("manageHerbsArchiveError"))
    }
  }

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedDosha("")
    setSelectedRasa("")
    setSelectedGuna("")
    setSelectedSrotas("")
    setSelectedStatus("All")
  }

  /* =========================================================
     STATUS COUNT
  ========================================================= */

  const getStatusCount = (status) => {
    if (useApi) {
      if (status === "All" && selectedStatus === "All" && !debouncedSearch) {
        return pagination.total ?? 0
      }
      if (selectedStatus === status) {
        return pagination.total ?? 0
      }
      return "—"
    }

    if (status === "All") {
      return normalizedHerbs.length
    }

    return normalizedHerbs.filter((herb) => herb.status === status).length
  }

  /* =========================================================
     RENDER
  ========================================================= */

  if (loading) {
    return <p role="status">{t("manageHerbsLoading")}</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <>
      {/* =====================================================
          PAGE HEADING
      ===================================================== */}

      <div className="manage-herbs-page-heading">

        <div>
          <h1>
            {t("adminManageHerbs")}
            <InfoTooltip contentKey="reviewHerb" text="Administrative management catalog for inspecting, verifying, drafting, and updating herb records." />
          </h1>

          <p>
            Review, update, verify, and maintain
            the Ayurvedic herb knowledge base.
          </p>
        </div>

        <button
          type="button"
          className="manage-herbs-add-button"
          onClick={() =>
            navigate("/admin/add-herb")
          }
        >
          + Add New Herb
        </button>

      </div>


      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <section className="manage-herbs-filter-card">

        {/* SEARCH */}

        <div className="manage-herbs-search-box">

          <span>
            ⌕
          </span>

          <input
            type="text"
            placeholder={t("manageHerbsSearchPlaceholder")}
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
          />

        </div>


        {/* DOSHA */}

        <div className="manage-herbs-filter-button">

          <select
            value={selectedDosha}
            onChange={(event) =>
              setSelectedDosha(
                event.target.value
              )
            }
          >

            <option value="">
              All Dosha
            </option>

            {doshaOptions.map(
              (dosha) => (
                <option
                  key={dosha}
                  value={dosha}
                >
                  {dosha}
                </option>
              )
            )}

          </select>

        </div>


        {/* RASA */}

        <div className="manage-herbs-filter-button">

          <select
            value={selectedRasa}
            onChange={(event) =>
              setSelectedRasa(
                event.target.value
              )
            }
          >

            <option value="">
              All Rasa
            </option>

            {rasaOptions.map(
              (rasa) => (
                <option
                  key={rasa}
                  value={rasa}
                >
                  {rasa}
                </option>
              )
            )}

          </select>

        </div>


        {/* GUNA */}

        <div className="manage-herbs-filter-button">

          <select
            value={selectedGuna}
            onChange={(event) =>
              setSelectedGuna(
                event.target.value
              )
            }
          >

            <option value="">
              All Guna
            </option>

            {gunaOptions.map(
              (guna) => (
                <option
                  key={guna}
                  value={guna}
                >
                  {guna}
                </option>
              )
            )}

          </select>

        </div>


        {/* SROTAS */}

        <div className="manage-herbs-filter-button">

          <select
            value={selectedSrotas}
            onChange={(event) =>
              setSelectedSrotas(
                event.target.value
              )
            }
          >

            <option value="">
              All Srotas
            </option>

            {srotasOptions.map(
              (srotas) => (
                <option
                  key={srotas}
                  value={srotas}
                >
                  {srotas}
                </option>
              )
            )}

          </select>

        </div>


        {/* RESULT COUNT */}

        <span className="manage-herbs-count">
          {filteredHerbs.length}{" "}
          {filteredHerbs.length === 1
            ? "herb"
            : "herbs"}
        </span>

      </section>


      {/* =====================================================
          STATUS TABS
      ===================================================== */}

      <div className="manage-herbs-status-tabs">

        <button
          type="button"
          className={`manage-herbs-status-tab ${
            selectedStatus === "All"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setSelectedStatus("All")
          }
        >
          All
          <span>
            {getStatusCount("All")}
          </span>
        </button>


        <button
          type="button"
          className={`manage-herbs-status-tab ${
            selectedStatus === "Verified"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setSelectedStatus("Verified")
          }
        >
          Verified
          <span>
            {getStatusCount("Verified")}
          </span>
        </button>


        <button
          type="button"
          className={`manage-herbs-status-tab ${
            selectedStatus === "Reviewed"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setSelectedStatus("Reviewed")
          }
        >
          Reviewed
          <span>
            {getStatusCount("Reviewed")}
          </span>
        </button>


        <button
          type="button"
          className={`manage-herbs-status-tab ${
            selectedStatus === "Draft"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setSelectedStatus("Draft")
          }
        >
          Draft
          <span>
            {getStatusCount("Draft")}
          </span>
        </button>

      </div>


      {/* =====================================================
          CLEAR FILTERS
      ===================================================== */}

      {(searchTerm ||
        selectedDosha ||
        selectedRasa ||
        selectedGuna ||
        selectedSrotas ||
        selectedStatus !== "All") && (

        <div className="manage-herbs-active-filters">

          <span>
            Filters applied
          </span>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>

        </div>

      )}


      {/* =====================================================
          HERB TABLE
      ===================================================== */}

      <section className="manage-herbs-table-card">

        <div className="manage-herbs-table-wrapper">

          <table className="manage-herbs-table">

            <thead>

              <tr>

                <th>
                  HERB
                  <InfoTooltip contentKey="herbName" />
                </th>

                <th>
                  BOTANICAL NAME
                  <InfoTooltip contentKey="botanicalName" />
                </th>

                <th>
                  RASA
                  <InfoTooltip contentKey="rasa" />
                </th>

                <th>
                  GUNA
                  <InfoTooltip contentKey="guna" />
                </th>

                <th>
                  VIRYA
                  <InfoTooltip contentKey="virya" />
                </th>

                <th>
                  VIPAKA
                  <InfoTooltip contentKey="vipaka" />
                </th>

                <th>
                  DOSHA
                  <InfoTooltip contentKey="dosha" />
                </th>

                <th>
                  SROTAS
                  <InfoTooltip contentKey="srotas" />
                </th>

                <th>
                  STATUS
                  <InfoTooltip title="Verification Status" text="Indicates whether an herb is a Draft, Reviewed, or Verified in the active dataset." />
                </th>

                <th>
                  LAST UPDATED
                </th>

                <th>
                  UPDATED BY
                </th>

                <th>
                  ACTION
                  <InfoTooltip title="Actions" text="Edit properties, verify records for search visibility, or archive entries." />
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredHerbs.length > 0 ? (

                filteredHerbs.map(
                  (herb) => (

                    <tr
                      key={
                        herb.id ||
                        herb.name
                      }
                    >

                      {/* HERB */}

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {herb.imageUrl || herb.image_url ? (
                            <img
                              src={herb.imageUrl || herb.image_url}
                              alt=""
                              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                          ) : null}
                          <div>
                            <strong>
                              {herb.name}
                            </strong>

                            {isSanskritLanguage(currentLanguage) ? (
                              (herb.herbNameEnglish || herb.englishName || herb.botanical !== "—") && (
                                <small>
                                  {herb.herbNameEnglish || herb.englishName || herb.botanical}
                                </small>
                              )
                            ) : (
                              herb.sanskrit !== "—" && (
                                <small>
                                  {herb.sanskrit}
                                </small>
                              )
                            )}
                          </div>
                        </div>
                      </td>


                      {/* BOTANICAL */}

                      <td>
                        <em>
                          {herb.botanical}
                        </em>
                      </td>


                      {/* RASA */}

                      <td>
                        {herb.rasa.length > 0
                          ? herb.rasa.join(", ")
                          : "—"}
                      </td>


                      {/* GUNA */}

                      <td>
                        {herb.guna.length > 0
                          ? herb.guna.join(", ")
                          : "—"}
                      </td>


                      {/* VIRYA */}

                      <td>
                        {herb.virya}
                      </td>


                      {/* VIPAKA */}

                      <td>
                        {herb.vipaka}
                      </td>


                      {/* DOSHA */}

                      <td>
                        {herb.dosha.length > 0
                          ? herb.dosha.join(", ")
                          : "—"}
                      </td>


                      {/* SROTAS */}

                      <td>
                        {herb.srotas.length > 0
                          ? herb.srotas.join(", ")
                          : "—"}
                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={`manage-herbs-status-badge status-${String(
                            herb.status
                          )
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )}`}
                        >
                          {herb.status}
                        </span>

                      </td>


                      {/* LAST UPDATED */}

                      <td>
                        {herb.updated}
                      </td>


                      {/* UPDATED BY */}

                      <td>
                        {herb.updatedBy}
                      </td>


                      {/* ACTIONS */}

                      <td>

                        <div className="manage-herbs-actions">

                          {/* VIEW */}

                          <button
                            type="button"
                            className="manage-herbs-action-button"
                            title="View herb"
                            aria-label="View herb"
                            onClick={() =>
                              handleHerbAction(
                                herb.id,
                                "view"
                              )
                            }
                          >
                            👁
                          </button>


                          {/* EDIT */}

                          <button
                            type="button"
                            className="manage-herbs-action-button"
                            title="Edit herb"
                            aria-label="Edit herb"
                            onClick={() =>
                              handleHerbAction(
                                herb.id,
                                "edit"
                              )
                            }
                          >
                            ✎
                          </button>


                          {/* REVIEW */}

                          <button
                            type="button"
                            className="manage-herbs-action-button"
                            title="Review herb"
                            aria-label="Review herb"
                            onClick={() =>
                              handleHerbAction(
                                herb.id,
                                "review"
                              )
                            }
                          >
                            ✓
                          </button>


                          {/* VERIFY (domain_expert/admin only) */}
                          {canVerifyHerbs(currentUser) && (
                            <button
                              type="button"
                              className="manage-herbs-action-button"
                              title="Verify herb"
                              aria-label="Verify herb"
                              onClick={() =>
                                handleVerifyHerb(herb.id)
                              }
                            >
                              ✅
                            </button>
                          )}


                          {/* DELETE (admin only) */}
                          {canArchiveHerbs(currentUser) && (
                          <button
                            type="button"
                            className="manage-herbs-action-button manage-herbs-delete-button"
                            title="Delete herb"
                            aria-label="Delete herb"
                            onClick={() =>
                              handleDeleteHerb(
                                herb.id
                              )
                            }
                          >
                            🗑
                          </button>
                          )}

                        </div>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="12"
                    className="manage-herbs-empty-state"
                  >

                    <div>

                      <strong>
                        {t("manageHerbsEmpty")}
                      </strong>

                      <p>
                        No herb matches the
                        current search or
                        filters.
                      </p>

                      <button
                        type="button"
                        onClick={
                          clearFilters
                        }
                      >
                        Clear filters
                      </button>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

        {useApi && pagination.totalPages > 1 && (
          <div className="manage-herbs-pagination" role="navigation" aria-label="Herb list pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {pagination.totalPages} ({pagination.total} herbs)
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}

      </section>

    </>
  )
}

export default ManageHerbs
