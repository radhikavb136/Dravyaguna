import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { USE_API } from "../api/client"
import { addFavorite, getFavorites, removeFavorite } from "../api/favorites"
import { getHerbById } from "../api/herbs"
import { useCurrentLanguage, useUiText } from "../i18n/useUiText"
import { getHerbDisplayName, getHerbSecondaryName } from "../utils/herbName"
import { recordFeedback } from "../api/model"
import InfoTooltip from "./InfoTooltip"

function HerbResultCard({ herb }) {
  const t = useUiText()
  const currentLanguage = useCurrentLanguage()
  const navigate = useNavigate()

  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState("")
  const [localizedPartUsed, setLocalizedPartUsed] = useState(null)
  const displayLanguage = herb.displayLanguage || currentLanguage || "en-IN"
  const displayName = getHerbDisplayName(herb, displayLanguage)
  const secondaryName = getHerbSecondaryName(herb, displayLanguage)
  const shouldTranslate = USE_API && displayLanguage !== "en-IN"

  useEffect(() => {
    if (!shouldTranslate || !herb.id) return
    let cancelled = false
    getHerbById(herb.id, displayLanguage)
      .then((localizedHerb) => {
        if (cancelled) return
        const translation = localizedHerb.translations?.part_used
        setLocalizedPartUsed({
          language: displayLanguage,
          text: translation?.text || "",
          provider: translation?.provider || "",
          status: translation?.status || "",
          unavailable: !translation || translation.translation_unavailable === true,
        })
      })
      .catch(() => {
        if (!cancelled) setLocalizedPartUsed({ language: displayLanguage, unavailable: true })
      })
    return () => { cancelled = true }
  }, [displayLanguage, herb.id, shouldTranslate])

  const activeTranslation = localizedPartUsed?.language === displayLanguage ? localizedPartUsed : null
  const displayPartUsed = activeTranslation?.text && !activeTranslation.unavailable
    ? activeTranslation.text
    : herb.partUsed
  const translationLabel = !shouldTranslate
    ? ""
    : !activeTranslation
      ? "Loading translation..."
      : activeTranslation.unavailable
        ? "Translation unavailable; showing original"
        : activeTranslation.provider === "mock"
          ? "Mock translation"
          : activeTranslation.status === "verified_translation"
            ? "Verified translation"
            : "Machine-translated"

  // =========================================
  // CHECK FAVORITE STATUS
  // =========================================

  useEffect(() => {
    if (USE_API) {
      getFavorites()
        .then(response => {
          setIsFavorite(Boolean(
            response.data?.some(savedHerb => savedHerb.herb_id === herb.id)
          ))
        })
        .catch(error => {
          console.error("Unable to load favorite herbs:", error)
          setFavoriteError(error.message || "Unable to load favorite status")
          setIsFavorite(false)
        })
      return
    }

    const savedFavorites = localStorage.getItem("favoriteHerbs")

    if (!savedFavorites) {
      setIsFavorite(false)
      return
    }

    try {
      const favorites = JSON.parse(savedFavorites)

      const alreadySaved = favorites.some(
        (savedHerb) => savedHerb.id === herb.id
      )

      setIsFavorite(alreadySaved)
    } catch (error) {
      console.error("Unable to load favorite herbs:", error)
      setIsFavorite(false)
    }
  }, [herb.id])

  // =========================================
  // FAVORITE
  // =========================================

  const handleFavorite = async () => {
    if (USE_API) {
      setFavoriteBusy(true)
      setFavoriteError("")
      try {
        if (isFavorite) {
          await removeFavorite(herb.id)
          setIsFavorite(false)
        } else {
          await addFavorite(herb.id)
          setIsFavorite(true)
          recordFeedback({
            queryText: herb.matchedQuery || herb.sanskritName || herb.englishName || 'herb',
            herbId: herb.id,
            interactionType: 'favorite',
          })
        }
      } catch (error) {
        console.error("Unable to update favorite herb:", error)
        setFavoriteError(error.message || "Unable to update favorite")
      } finally {
        setFavoriteBusy(false)
      }
      return
    }

    const savedFavorites = localStorage.getItem("favoriteHerbs")

    let favorites = []

    if (savedFavorites) {
      try {
        favorites = JSON.parse(savedFavorites)

        if (!Array.isArray(favorites)) {
          favorites = []
        }
      } catch (error) {
        console.error("Unable to read favorite herbs:", error)
        favorites = []
      }
    }

    if (isFavorite) {
      // Remove herb
      const updatedFavorites = favorites.filter(
        (savedHerb) => savedHerb.id !== herb.id
      )

      localStorage.setItem(
        "favoriteHerbs",
        JSON.stringify(updatedFavorites)
      )

      setIsFavorite(false)
    } else {
      // Add herb
      const updatedHerb = {
        ...herb,
        id: herb.id || herb.englishName,
      }

      const updatedFavoritesList = [
        ...favorites,
        updatedHerb,
      ]

      localStorage.setItem(
        "favoriteHerbs",
        JSON.stringify(updatedFavoritesList)
      )

      setIsFavorite(true)
    }
  }

  // =========================================
  // VIEW HERB PROFILE
  // =========================================

  const handleViewProfile = () => {
    recordFeedback({
      queryText: herb.matchedQuery || herb.sanskritName || herb.englishName || 'herb',
      herbId: herb.id,
      interactionType: 'click',
    })
    navigate(`/herb/${herb.id}`, {
      state: { searchQuery: herb.matchedQuery || herb.sanskritName || herb.englishName },
    })
  }

  // =========================================
  // COMPARE HERB
  // =========================================

  const handleCompare = () => {
    recordFeedback({
      queryText: herb.matchedQuery || herb.sanskritName || herb.englishName || 'herb',
      herbId: herb.id,
      interactionType: 'compare',
    })
    const savedCompareHerbs =
      localStorage.getItem("selectedCompareHerbs")

    let compareHerbs = []

    if (savedCompareHerbs) {
      try {
        compareHerbs = JSON.parse(savedCompareHerbs)

        if (!Array.isArray(compareHerbs)) {
          compareHerbs = []
        }
      } catch (error) {
        console.error("Unable to read comparison herbs:", error)
        compareHerbs = []
      }
    }

    const alreadySelected = compareHerbs.some(
      (selectedHerb) => selectedHerb.id === herb.id
    )

    if (alreadySelected) {
      navigate("/compare")
      return
    }

    if (compareHerbs.length >= 4) {
      alert(t("compareMaxFourHerbs"))
      return
    }

    const updatedCompareHerbs = [
      ...compareHerbs.map((item) => (
        item && typeof item === "object" ? item.id : item
      )),
      herb.id,
    ].filter(Boolean)

    localStorage.setItem(
      "selectedCompareHerbs",
      JSON.stringify(updatedCompareHerbs)
    )

    navigate("/compare")
  }

  // =========================================
  // AYURVEDIC TAGS
  // =========================================
  //
  // Real dataset:
  // rasa       -> array
  // guna       -> array
  // virya      -> string
  // vipaka     -> string
  // karma      -> array
  //
  // We keep the same visual tag layout.
  // =========================================

  const herbTags = [
    ...(Array.isArray(herb.rasa) ? herb.rasa : []),
    ...(Array.isArray(herb.guna) ? herb.guna : []),
    herb.virya,
    herb.vipaka,
  ].filter(Boolean)

  // =========================================
  // INDICATIONS
  // =========================================

  const indications = Array.isArray(herb.indications)
    ? herb.indications.join(", ")
    : herb.indications || ""

  // =========================================
  // KARMA
  // =========================================

  const karma = Array.isArray(herb.karma)
    ? herb.karma.join(", ")
    : herb.karma || ""

  return (
    <article className="herb-result-card">

      {/* =========================================
          HERB VISUAL
          ========================================= */}

      <div
        className="herb-result-visual"
        style={{
          backgroundColor: herb.visualColor || "#a5b195",
        }}
      >

        <div className="herb-leaf-box">

          {herb.imageUrl || herb.image_url ? (
            <img
              src={herb.imageUrl || herb.image_url}
              alt={displayName || "Herb"}
              className="herb-result-card-photo"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }}
            />
          ) : (
            <svg
              viewBox="0 0 64 64"
              className="herb-leaf-icon"
              aria-hidden="true"
            >

              <path
                d="M52 10C31 12 16 22 12 38c-2 8 3 14 11 14 16 0 27-17 29-42Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M12 52c8-11 17-19 29-26"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />

            </svg>
          )}

        </div>

      </div>


      {/* =========================================
          HERB INFORMATION
          ========================================= */}

      <div className="herb-result-info">

        <div className="herb-result-top">

          <div>

            <h2>
              {displayName}
            </h2>

            <em>
              {secondaryName || "Botanical name unavailable"}
            </em>

          </div>


          {/* FAVORITE */}

          <button
            className={`herb-favorite-button ${
              isFavorite ? "favorite-active" : ""
            }`}
            type="button"
            onClick={handleFavorite}
            disabled={favoriteBusy}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Remove ${displayName} from favorites`
                : `Save ${displayName}`
            }
          >
            {isFavorite ? "♥" : "♡"}
          </button>

          {favoriteError && <p role="alert">{favoriteError}</p>}

        </div>


        {/* =========================================
            MATCH + STATUS
            ========================================= */}

        <div className="herb-match-row">

          <strong>
            {herb.match ?? 0}%
          </strong>

          <span>
            match
          </span>

          <InfoTooltip contentKey="searchRelevance" />

          {herb.verificationStatus && (
            <span
              className={`verification-badge ${
                herb.verificationStatus.toLowerCase()
              }`}
            >
              ✓ {herb.verificationStatus}
            </span>
          )}

        </div>


        {/* =========================================
            AYURVEDIC ATTRIBUTES
            ========================================= */}

        <div className="herb-result-tags">

          {herbTags.map((tag, index) => (
            <span key={`${herb.id}-tag-${index}`}>
              {tag}
            </span>
          ))}

        </div>


        {/* =========================================
            DESCRIPTION
            ========================================= */}

        <p className="herb-result-description">

          {displayPartUsed && (
            <>
              <strong>Part used:</strong>{" "}
              {displayPartUsed}
              {" "}
            </>
          )}

          {indications && (
            <>
              <strong>Major indications:</strong>{" "}
              {indications}
              {" "}
            </>
          )}

          {karma && (
            <>
              <strong>Karma:</strong>{" "}
              {karma}
            </>
          )}

        </p>

        {translationLabel && (herb.partUsed || activeTranslation?.text) && (
          <p role="status">{translationLabel}</p>
        )}


        {/* =========================================
            ACTIONS
            ========================================= */}

        <div className="herb-result-actions">

          <button
            className="view-profile-button"
            type="button"
            onClick={handleViewProfile}
          >
            View profile
            <span>›</span>
          </button>


          <button
            className="compare-herb-button"
            type="button"
            onClick={handleCompare}
          >
            <span>♧</span>
            Compare
          </button>

        </div>

      </div>

    </article>
  )
}

export default HerbResultCard
