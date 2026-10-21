import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { getAccount } from "../api/account"
import { getFilterOptions } from "../api/vocabulary"
import { USE_API } from "../api/client"
import DashboardNavbar from "../components/DashboardNavbar"
import Sidebar from "../components/Sidebar"
import DetailedSearch from "../components/DetailedSearch"
import "../styles/SearchPage.css"

function SearchPage() {

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // =========================================
  // READ SAVED SEARCH SETTINGS
  // =========================================

  const requestedMode = searchParams.get("mode")
  const [defaultMode, setDefaultMode] = useState("simple")
  const [preferenceError, setPreferenceError] = useState("")
  const [searchVocabulary, setSearchVocabulary] = useState(null)
  const [filtersLoading, setFiltersLoading] = useState(USE_API)
  const [filtersError, setFiltersError] = useState("")
  const [filtersRetry, setFiltersRetry] = useState(0)

  useEffect(() => {
    if (requestedMode) return
    if (USE_API) {
      getAccount()
        .then(({ preferences }) => setDefaultMode(preferences?.defaultSearch || "simple"))
        .catch((error) => setPreferenceError(error.message || "Unable to load search preference"))
      return
    }
    try {
      const settings = JSON.parse(localStorage.getItem("herbSettings") || "null")
      setDefaultMode(settings?.defaultSearch || "simple")
    } catch {
      setDefaultMode("simple")
    }
  }, [requestedMode])

  useEffect(() => {
    if (!USE_API) return undefined
    let cancelled = false
    getFilterOptions()
      .then((options) => {
        if (!cancelled) setSearchVocabulary(options)
      })
      .catch((error) => {
        if (!cancelled) setFiltersError(error.message || "Unable to load search filters")
      })
      .finally(() => {
        if (!cancelled) setFiltersLoading(false)
      })
    return () => { cancelled = true }
  }, [filtersRetry])

  const mode = requestedMode || defaultMode


  // =========================================
  // SIMPLE SEARCH STATE
  // =========================================

  const [searchQuery, setSearchQuery] = useState("")

  const [rasa, setRasa] = useState("")
  const [virya, setVirya] = useState("")
  const [vipaka, setVipaka] = useState("")
  const [majorDisease, setMajorDisease] = useState("")


  // =========================================
  // SEARCH MODE CHANGE
  // =========================================

  const handleModeChange = (selectedMode) => {
    navigate(`/search?mode=${selectedMode}`)
  }


  // =========================================
  // SIMPLE SEARCH
  // =========================================

  const handleSimpleSearch = () => {

    if (
      !searchQuery.trim() &&
      !rasa &&
      !virya &&
      !vipaka &&
      !majorDisease
    ) {
      return
    }

    const params = new URLSearchParams()

    params.set("mode", "simple")

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim())
    }

    if (rasa) {
      params.set("rasa", rasa)
    }

    if (virya) {
      params.set("virya", virya)
    }

    if (vipaka) {
      params.set("vipaka", vipaka)
    }

    if (majorDisease) {
      params.set("majorDisease", majorDisease)
    }

    navigate(`/search-results?${params.toString()}`)
  }


  // =========================================
  // ENTER KEY
  // =========================================

  const handleSearchKeyDown = (e) => {

    if (e.key === "Enter") {
      handleSimpleSearch()
    }

  }


  // =========================================
  // SEARCH PATTERN
  // =========================================

  const handlePatternClick = (pattern) => {
    setSearchQuery(pattern)
  }


  return (

    <div className="search-page-layout">

      <DashboardNavbar />

      <div className="search-page-body">

        <Sidebar />

        <main className="search-page-content">

          {/* =========================================
              SEARCH PAGE HEADER
              ========================================= */}

          <section className="search-page-header">

            {preferenceError && <p role="alert">{preferenceError}</p>}

            <div className="search-header-text">

              {mode === "detailed" ? (

                <>
                  <h1>
                    Search by Ayurvedic parameters
                  </h1>

                  <p className="search-page-description">
                    Select classical Ayurvedic attributes to find herbs
                    that match multiple clinical criteria.
                  </p>
                </>

              ) : (

                <>
                  <h1>
                    Describe the patient's concern
                  </h1>

                  <p className="search-page-description">
                    Use everyday language and add Ayurvedic clinical
                    factors to refine the results.
                  </p>
                </>

              )}

            </div>


            {/* =========================================
                SEARCH MODE SWITCH
                ========================================= */}

            <div className="search-mode-switch">

              <button
                className={`search-mode-button ${
                  mode === "simple" ? "active" : ""
                }`}
                type="button"
                onClick={() => handleModeChange("simple")}
              >
                <span>✦</span>
                Simple search
              </button>


              <button
                className={`search-mode-button ${
                  mode === "detailed" ? "active" : ""
                }`}
                type="button"
                onClick={() => handleModeChange("detailed")}
              >
                <span>☷</span>
                Detailed search
              </button>

            </div>

          </section>


          {/* =========================================
              SEARCH CONTENT
              ========================================= */}

          {mode === "detailed" ? (

            <DetailedSearch />

          ) : (

            <>

              <section className="simple-search-card">

                <div className="simple-search-heading">

                  <div className="simple-search-icon">
                    ✦
                  </div>

                  <div>

                    <h2>
                      Tell us what you're seeing
                    </h2>

                    <p>
                      Symptoms, patterns, timing, and triggers all help
                      refine the match.
                    </p>

                  </div>

                </div>


                <div className="simple-search-input-row">

                  <div className="simple-search-input">

                    <span className="input-search-icon">
                      ⌕
                    </span>

                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(e.target.value)
                      }
                      onKeyDown={handleSearchKeyDown}
                      placeholder="e.g. joint pain, worse in cold weather, morning stiffness"
                    />

                  </div>


                  <button
                    className="simple-search-button"
                    type="button"
                    disabled={
                      !searchQuery.trim() &&
                      !rasa &&
                      !virya &&
                      !vipaka &&
                      !majorDisease
                    }
                    onClick={handleSimpleSearch}
                  >
                    Search
                    <span>⌕</span>
                  </button>

                </div>


                <div className="simple-search-factors">

                  <div className="simple-search-factors-header">

                    <div>

                      <span className="factors-label">
                        AYURVEDIC CLINICAL CONTEXT
                      </span>

                      <h3>
                        Refine the search
                      </h3>

                    </div>

                    <p>
                      Add classical factors to narrow the herb match.
                    </p>

                  </div>


                  <div className="simple-search-factors-grid">

                    {USE_API && filtersLoading && <p role="status">Loading clinical filters...</p>}
                    {USE_API && filtersError && (
                      <p role="alert">
                        Unable to load clinical filters: {filtersError}{" "}
                        <button type="button" onClick={() => { setFiltersLoading(true); setFiltersError(""); setFiltersRetry((count) => count + 1) }}>Retry</button>
                      </p>
                    )}

                    <div className="simple-search-factor">

                      <label htmlFor="rasa">
                        Rasa
                      </label>

                      <select
                        id="rasa"
                        value={rasa}
                        onChange={(e) =>
                          setRasa(e.target.value)
                        }
                      >

                        <option value="">
                          Any Rasa
                        </option>

                        {USE_API
                          ? (searchVocabulary?.rasa || []).map((term) => <option key={term.id} value={term.slug}>{term.canonical_en}</option>)
                          : ["Madhura", "Amla", "Lavana", "Katu", "Tikta", "Kashaya"].map((term) => <option key={term} value={term}>{term}</option>)}

                      </select>

                    </div>


                    <div className="simple-search-factor">

                      <label htmlFor="virya">
                        Virya
                      </label>

                      <select
                        id="virya"
                        value={virya}
                        onChange={(e) =>
                          setVirya(e.target.value)
                        }
                      >

                        <option value="">
                          Any Virya
                        </option>

                        {USE_API
                          ? (searchVocabulary?.virya || []).map((term) => <option key={term.id} value={term.slug}>{term.canonical_en}</option>)
                          : ["Ushna", "Sheeta"].map((term) => <option key={term} value={term}>{term}</option>)}

                      </select>

                    </div>


                    <div className="simple-search-factor">

                      <label htmlFor="vipaka">
                        Vipaka
                      </label>

                      <select
                        id="vipaka"
                        value={vipaka}
                        onChange={(e) =>
                          setVipaka(e.target.value)
                        }
                      >

                        <option value="">
                          Any Vipaka
                        </option>

                        {USE_API
                          ? (searchVocabulary?.vipaka || []).map((term) => <option key={term.id} value={term.slug}>{term.canonical_en}</option>)
                          : ["Madhura", "Amla", "Katu"].map((term) => <option key={term} value={term}>{term}</option>)}

                      </select>

                    </div>


                    <div className="simple-search-factor">

                      <label htmlFor="majorDisease">
                        Major Disease
                      </label>

                      <select
                        id="majorDisease"
                        value={majorDisease}
                        onChange={(e) =>
                          setMajorDisease(e.target.value)
                        }
                      >

                        <option value="">
                          Any Disease
                        </option>

                        {USE_API
                          ? (searchVocabulary?.indications || []).map((term) => <option key={term.id} value={term.slug}>{term.canonical_en}</option>)
                          : ["Diabetes", "Hypertension", "Arthritis", "Asthma"].map((term) => <option key={term} value={term}>{term}</option>)}

                      </select>

                    </div>

                  </div>

                </div>


                <div className="search-patterns">

                  <span className="patterns-label">
                    Start with a pattern
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handlePatternClick(
                        "Digestive discomfort after meals"
                      )
                    }
                  >
                    Digestive discomfort after meals
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePatternClick(
                        "Low energy and restless sleep"
                      )
                    }
                  >
                    Low energy and restless sleep
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePatternClick(
                        "Seasonal congestion"
                      )
                    }
                  >
                    Seasonal congestion
                  </button>

                </div>

              </section>


              <section className="clinical-nuance-card">

                <div className="clinical-nuance-icon">
                  ✧
                </div>

                <div className="clinical-nuance-content">

                  <h2>
                    Search with clinical nuance
                  </h2>

                  <p>
                    Include timing, triggers, qualities, associated
                    symptoms, and Ayurvedic factors for a more precise match.
                  </p>

                </div>

                <span className="clinical-nuance-number">
                  01
                </span>

              </section>

            </>

          )}

        </main>

      </div>

    </div>
  )
}

export default SearchPage
