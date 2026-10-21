import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { USE_API } from "../api/client"
import { getFavorites } from "../api/favorites"
import { getHerbById } from "../api/herbs"

import "../styles/SavedFavorites.css"

function SavedFavorites() {
  const navigate = useNavigate()

  const [savedFavorites, setSavedFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // =========================================================
  // LOAD REAL SAVED FAVORITES
  // =========================================================

  useEffect(() => {
    let cancelled = false
    const loadFavorites = async () => {
      setLoading(true)
      setError("")
      try {
        if (USE_API) {
          const response = await getFavorites()
          const herbs = await Promise.all(
            (response.data || []).map((favorite) => getHerbById(favorite.herb_id))
          )
          if (!cancelled) setSavedFavorites(herbs)
          return
        }

        const savedData = localStorage.getItem("favoriteHerbs")
        const favorites = savedData ? JSON.parse(savedData) : []
        if (!cancelled) setSavedFavorites(Array.isArray(favorites) ? favorites : [])
      } catch (loadError) {
        if (!cancelled) {
          setSavedFavorites([])
          setError(loadError.message || "Unable to load saved favorites")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFavorites()

    if (!USE_API) {
      const handleStorageChange = (event) => {
        if (event.key === "favoriteHerbs") loadFavorites()
      }
      window.addEventListener("storage", handleStorageChange)
      return () => {
        cancelled = true
        window.removeEventListener("storage", handleStorageChange)
      }
    }

    return () => { cancelled = true }
  }, [])

  // =========================================================
  // FORMAT DATA
  // =========================================================

  const formatValue = (value) => {
    if (!value) {
      return "—"
    }

    if (typeof value === "string") {
      return value
    }

    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .join(" · ")
    }

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
            key.charAt(0).toUpperCase() +
            key.slice(1)

          return `${formattedKey}: ${itemValue}`
        })
        .join(" · ")
    }

    return String(value)
  }

  // =========================================================
  // HERB NAME
  // =========================================================

  const getHerbName = (herb) => {
    return (
      herb.englishName ||
      herb.name ||
      "Unnamed herb"
    )
  }

  // =========================================================
  // VIEW ALL
  // =========================================================

  const handleViewAll = () => {
    navigate("/favorites")
  }

  // =========================================================
  // VIEW HERB
  // =========================================================

  const handleViewHerb = (herbId) => {
    navigate(`/herb/${herbId}`)
  }

  // =========================================================
  // SHOW ONLY FIRST 4
  // =========================================================

  const visibleFavorites =
    savedFavorites.slice(0, 4)

  const remainingCount =
    Math.max(
      savedFavorites.length -
        visibleFavorites.length,
      0
    )

  return (
    <section className="saved-favorites">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="saved-favorites-header">

        <h2>
          Saved Favorites
        </h2>

        <button
          className="saved-favorites-view-all"
          type="button"
          onClick={handleViewAll}
        >
          View All →
        </button>

      </div>

      {/* =====================================================
          FAVORITES LIST
          ===================================================== */}

      <div className="saved-favorites-list">

        {loading && <p role="status">Loading saved favorites...</p>}
        {!loading && error && <p role="alert">{error}</p>}

        {/* EMPTY STATE */}

        {!loading && !error && savedFavorites.length === 0 && (

          <div className="saved-favorite-item">

            <div className="saved-favorite-info">

              <div className="saved-favorite-name-row">

                <h3>
                  No saved herbs
                </h3>

              </div>

              <div className="saved-favorite-details">

                <span>
                  Save herbs to see them here.
                </span>

              </div>

            </div>

            <button
              className="saved-favorite-view-button"
              type="button"
              onClick={() =>
                navigate("/herb-library")
              }
            >
              Explore
            </button>

          </div>

        )}

        {/* SAVED HERBS */}

        {!loading && !error && visibleFavorites.map((herb) => {

          const herbName =
            getHerbName(herb)

          const rasa =
            formatValue(herb.rasa)

          const virya =
            formatValue(herb.virya)

          return (

            <div
              className="saved-favorite-item"
              key={herb.id}
            >

              <div className="saved-favorite-info">

                <div className="saved-favorite-name-row">

                  <h3>
                    {herbName}
                  </h3>

                  <span className="saved-favorite-status">

                    {herb.status ===
                    "Verified"
                      ? "✓ "
                      : ""}

                    {herb.status ||
                      "Draft"}

                  </span>

                </div>

                <div className="saved-favorite-details">

                  <span>
                    Rasa: {rasa}
                  </span>

                  <span>
                    Virya: {virya}
                  </span>

                </div>

              </div>

              <button
                className="saved-favorite-view-button"
                type="button"
                onClick={() =>
                  handleViewHerb(herb.id)
                }
              >
                View
              </button>

            </div>

          )
        })}

        {/* SHOW MORE */}

        {remainingCount > 0 && (

          <button
            className="saved-favorites-show-more"
            type="button"
            onClick={handleViewAll}
          >
            ↓ Show {remainingCount} more
          </button>

        )}

      </div>

    </section>
  )
}

export default SavedFavorites
