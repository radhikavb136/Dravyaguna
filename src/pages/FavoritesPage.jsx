import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getFavorites, removeFavorite as removeFavoriteApi, getSavedSearches, removeSavedSearch } from "../api/favorites"
import { getHerbById } from "../api/herbs"
import DashboardNavbar from "../components/DashboardNavbar"
import PageBack from "../components/PageBack"
import Sidebar from "../components/Sidebar"
import { localizeApiError } from "../i18n/localizeApiError"
import { useCurrentLanguage, useUiText } from "../i18n/useUiText"
import { getHerbDisplayName, getHerbSecondaryName } from "../utils/herbName"
import "../styles/FavoritesPage.css"

function FavoritesPage() {
  const t = useUiText()
  const currentLanguage = useCurrentLanguage()
  const navigate = useNavigate()

  const [savedHerbs, setSavedHerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("herbs")
  const [savedSearches, setSavedSearches] = useState([])
  const [searchesLoading, setSearchesLoading] = useState(false)
  const [searchesError, setSearchesError] = useState("")

  // =========================================================
  // LOAD SAVED HERBS
  // =========================================================

  const loadSavedSearches = async () => {
    if (import.meta.env.VITE_USE_API !== 'true') return
    setSearchesLoading(true)
    setSearchesError("")
    try {
      const response = await getSavedSearches()
      setSavedSearches(response.data || [])
    } catch (err) {
      setSearchesError(localizeApiError(t, err.message || t("favoritesSearchesLoadError")))
    } finally {
      setSearchesLoading(false)
    }
  }

  const loadFavorites = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'
      
      if (useApi) {
        const response = await getFavorites()
        // Convert backend favorites to frontend format
        const results = await Promise.allSettled(
          (response.data || []).map((fav) => getHerbById(fav.herb_id))
        )
        const herbs = results
          .filter((r) => r.status === "fulfilled" && r.value)
          .map((r) => r.value)
        setSavedHerbs(herbs)
      } else {
        // Fallback to localStorage for mock data
        const savedFavorites = localStorage.getItem("favoriteHerbs")
        if (!savedFavorites) {
          setSavedHerbs([])
          return
        }
        try {
          const favorites = JSON.parse(savedFavorites)
          if (Array.isArray(favorites)) {
            setSavedHerbs(favorites)
          } else {
            setSavedHerbs([])
          }
        } catch (error) {
          console.error("Unable to load saved herbs:", error)
          setSavedHerbs([])
        }
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
      setError(localizeApiError(t, err.message || t("favoritesLoadError")))
      setSavedHerbs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
    loadSavedSearches()
  }, [])

  // =========================================================
  // REMOVE HERB FROM FAVORITES
  // =========================================================

  const removeFavorite = async (herbId) => {
    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'
      
      if (useApi) {
        await removeFavoriteApi(herbId)
        // Reload favorites from API
        await loadFavorites()
      } else {
        // Fallback to localStorage for mock data
        const updatedFavorites = savedHerbs.filter(
          (herb) => herb.id !== herbId
        )
        setSavedHerbs(updatedFavorites)
        localStorage.setItem(
          "favoriteHerbs",
          JSON.stringify(updatedFavorites)
        )
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err)
      setError(localizeApiError(t, err.message || t("favoritesRemoveError")))
    }
  }

  const handleRemoveSearch = async (id) => {
    try {
      await removeSavedSearch(id)
      setSavedSearches((previous) => previous.filter((item) => item.id !== id))
    } catch (err) {
      setSearchesError(localizeApiError(t, err.message || t("favoritesRemoveSearchError")))
    }
  }

  const handleRunSearch = (saved) => {
    const data = saved.filters || {}
    const params = new URLSearchParams({ mode: data.mode || "simple" })
    if (data.query) params.set("query", data.query)
    if (data.parameters && Object.keys(data.parameters).length) {
      params.set("parameters", encodeURIComponent(JSON.stringify(data.parameters)))
    }
    navigate(`/search-results?${params.toString()}`)
  }

  // =========================================================
  // OPEN HERB LIBRARY
  // =========================================================

  const handleExploreHerbs = () => {
    navigate("/herb-library")
  }

  // =========================================================
  // OPEN HERB DETAIL PAGE
  // =========================================================

  const handleViewProfile = (herbId) => {
    navigate(`/herb/${herbId}`)
  }

  // =========================================================
  // FORMAT OBJECT VALUES
  // =========================================================

  const formatValue = (value) => {
    if (!value) {
      return null
    }

    // If value is already a string
    if (typeof value === "string") {
      return value
    }

    // If value is an array
    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .join(" · ")
    }

    // If value is an object
    if (typeof value === "object") {
      return Object.entries(value)
        .filter(
          ([, itemValue]) =>
            itemValue !== undefined &&
            itemValue !== null &&
            itemValue !== "" &&
            itemValue !== "—"
        )
        .map(([key, itemValue]) => {
          const formattedKey =
            key.charAt(0).toUpperCase() + key.slice(1)

          return `${formattedKey}: ${itemValue}`
        })
        .join(" · ")
    }

    return String(value)
  }

  // =========================================================
  // GET HERB NAME
  // =========================================================

  const getHerbName = (herb) => {
    return (
      getHerbDisplayName(herb, currentLanguage) ||
      herb.englishName ||
      herb.name ||
      "Unnamed herb"
    )
  }

  // =========================================================
  // GET BOTANICAL NAME
  // =========================================================

  const getBotanicalName = (herb) => {
    return (
      getHerbSecondaryName(herb, currentLanguage) ||
      herb.botanicalName ||
      herb.scientificName ||
      "Botanical name unavailable"
    )
  }

  if (loading) {
    return <p role="status">{t("favoritesLoading")}</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <div className="favorites-page-layout">

      {/* Top Navbar */}
      <DashboardNavbar />

      <div className="favorites-page-body">

        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="favorites-page-content">

          <div className="favorites-content-inner">

            {/* =================================================
                PAGE HEADER
                ================================================= */}

            <section className="favorites-header">
              <PageBack fallback="/doctor" />

              <div>

                <p className="favorites-breadcrumb">
                  WORKSPACE / SAVED
                </p>

                <h1>
                  {t("favoritesTitle")}
                </h1>

              </div>

              <div className="saved-count">

                <span className="saved-count-icon">
                  ♡
                </span>

                <span>
                  {savedHerbs.length}{" "}
                  {savedHerbs.length === 1
                    ? "herb"
                    : "herbs"}{" "}
                  saved
                </span>

              </div>

            </section>

            {/* =================================================
                TABS
                ================================================= */}

            <div className="favorites-tabs">

              <button
                className={`favorites-tab ${activeTab === "herbs" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("herbs")}
              >
                {t("favoritesTabHerbs")}
              </button>

              <button
                className={`favorites-tab ${activeTab === "searches" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("searches")}
              >
                {t("favoritesTabSearches")}
              </button>

            </div>

            {error && activeTab === "herbs" && <p role="alert">{error}</p>}
            {searchesError && activeTab === "searches" && <p role="alert">{searchesError}</p>}

            {activeTab === "searches" ? (
              searchesLoading ? <p role="status">{t("favoritesLoadingSearches")}</p> : savedSearches.length === 0 ? (
                !searchesError && <section className="favorites-empty-state"><h2>{t("favoritesNoSearchesTitle")}</h2><p>{t("favoritesNoSearchesDesc")}</p></section>
              ) : (
                <section className="saved-herbs-grid">
                  {savedSearches.map((saved) => (
                    <article className="saved-herb-card" key={saved.id}>
                      <h2>{saved.name}</h2>
                      <p>{saved.filters?.mode === "detailed" ? "Detailed search" : "Simple search"}{saved.filters?.query ? ` · ${saved.filters.query}` : ""}</p>
                      <button type="button" className="saved-view-profile" onClick={() => handleRunSearch(saved)}>Run search</button>
                      <button type="button" className="saved-view-profile" onClick={() => handleRemoveSearch(saved.id)}>Remove</button>
                    </article>
                  ))}
                </section>
              )
            ) : (
              <>

            {/* =================================================
                EMPTY STATE
                ================================================= */}

            {loading ? <p role="status">{t("favoritesLoadingHerbs")}</p> : savedHerbs.length === 0 && !error ? (

              <section className="favorites-empty-state">

                <div className="empty-favorites-icon">
                  ♡
                </div>

                <h2>
                  Your saved library is empty
                </h2>

                <p>
                  Save herbs from their information pages
                  to return to them quickly.
                </p>

                <button
                  className="explore-herbs-button"
                  type="button"
                  onClick={handleExploreHerbs}
                >
                  Explore herbs
                </button>

              </section>

            ) : (

              /* =================================================
                 SAVED HERBS
                 ================================================= */

              <section className="saved-herbs-grid">

                {savedHerbs.map((herb) => {

                  const herbName = getHerbName(herb)
                  const botanicalName =
                    getBotanicalName(herb)

                  const dosha =
                    formatValue(herb.dosha)

                  const rasa =
                    formatValue(herb.rasa)

                  const guna =
                    formatValue(herb.guna)

                  const virya =
                    formatValue(herb.virya)

                  const vipaka =
                    formatValue(herb.vipaka)

                  const karma = [
                    herb.importantKarma,
                    herb.otherKarma,
                  ]
                    .filter(Boolean)
                    .map((value) =>
                      formatValue(value)
                    )
                    .filter(Boolean)
                    .join(" · ")

                  return (

                    <article
                      className="saved-herb-card"
                      key={herb.id}
                    >

                      {/* =================================================
                          HERB VISUAL
                          ================================================= */}

                      <div
                        className="saved-herb-visual"
                        style={{
                          backgroundColor:
                            herb.visualColor ||
                            "#a5b195",
                        }}
                      >
                        {herb.imageUrl || herb.image_url ? (
                          <img
                            src={herb.imageUrl || herb.image_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }}
                          />
                        ) : (
                          <span>♧</span>
                        )}
                      </div>

                      {/* =================================================
                          HERB INFORMATION
                          ================================================= */}

                      <div className="saved-herb-info">

                        <div className="saved-herb-top">

                          <div>

                            <h2>
                              {herbName}
                            </h2>

                            <em>
                              {botanicalName}
                            </em>

                          </div>

                          {/* REMOVE FAVORITE */}

                          <button
                            className="saved-herb-favorite"
                            type="button"
                            onClick={() =>
                              removeFavorite(herb.id)
                            }
                            aria-label={`Remove ${herbName} from favorites`}
                          >
                            ♥
                          </button>

                        </div>

                        {/* =================================================
                            STATUS
                            ================================================= */}

                        <div className="saved-herb-match">

                          <span className="saved-verified">

                            {herb.status ===
                            "Verified"
                              ? "✓"
                              : "◷"}

                            {" "}
                            {herb.status ||
                              "Draft"}

                          </span>

                        </div>

                        {/* =================================================
                            AYURVEDIC PROPERTIES
                            ================================================= */}

                        <div className="saved-herb-tags">

                          {rasa && (
                            <span>
                              Rasa: {rasa}
                            </span>
                          )}

                          {guna && (
                            <span>
                              Guna: {guna}
                            </span>
                          )}

                          {virya && (
                            <span>
                              Virya: {virya}
                            </span>
                          )}

                          {vipaka && (
                            <span>
                              Vipaka: {vipaka}
                            </span>
                          )}

                          {dosha && (
                            <span>
                              Dosha: {dosha}
                            </span>
                          )}

                        </div>

                        {/* =================================================
                            DESCRIPTION
                            ================================================= */}

                        <p>

                          {herb.partUsed && (
                            <>
                              <strong>
                                Part used:
                              </strong>{" "}
                              {formatValue(
                                herb.partUsed
                              )}
                              {" "}
                            </>
                          )}

                          {herb.majorDiseases && (
                            <>
                              <strong>
                                Major indications:
                              </strong>{" "}
                              {formatValue(
                                herb.majorDiseases
                              )}
                            </>
                          )}

                          {!herb.partUsed &&
                            !herb.majorDiseases &&
                            herb.description && (
                              <>
                                {herb.description}
                              </>
                            )}

                        </p>

                        {/* =================================================
                            KARMA
                            ================================================= */}

                        {karma && (
                          <div className="saved-herb-tags">

                            <span>
                              Karma: {karma}
                            </span>

                          </div>
                        )}

                        {/* =================================================
                            VIEW PROFILE
                            ================================================= */}

                        <button
                          className="saved-view-profile"
                          type="button"
                          onClick={() =>
                            handleViewProfile(
                              herb.id
                            )
                          }
                        >
                          View profile
                          <span>›</span>
                        </button>

                      </div>

                    </article>

                  )
                })}

              </section>

            )}

              </>

            )}

          </div>

        </main>

      </div>

    </div>
  )
}

export default FavoritesPage
