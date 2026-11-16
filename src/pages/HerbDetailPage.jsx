import { useEffect, useState, useMemo } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"

import DashboardNavbar from "../components/DashboardNavbar"
import Sidebar from "../components/Sidebar"
import PageBack from "../components/PageBack"
import herbDataset from "../data/herbDataset"
import { getHerbById } from "../api/herbs"
import { USE_API } from "../api/client"
import { addFavorite, getFavorites, removeFavorite } from "../api/favorites"
import InfoIcon from "../components/InfoIcon"
import InfoTooltip from "../components/InfoTooltip"
import { getCurrentUser } from "../api/auth"
import { verifyTranslation } from "../api/translations"
import { getBackendRole } from "../utils/roles"
import { getAccount } from "../api/account"
import { setInterfaceLanguage, useCurrentLanguage, useUiText } from "../i18n/useUiText"
import { getHerbDisplayName, getHerbSecondaryName } from "../utils/herbName"
import { recordFeedback } from "../api/model"

import "../styles/HerbDetailPage.css"


function LeafIcon() {
  return (
    <div className="detail-leaf-icon">
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M48.5 10.5C35.5 12 23.2 17.2 16.5 26.3C9.8 35.4 11.8 47 12.4 49.6C15 49.9 27.5 49.5 36.1 41.2C44.3 33.3 48.4 20.7 48.5 10.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M13 50C21.5 41.2 29.5 34.3 41.5 25.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        <path
          d="M23.5 39.5C20.5 38.2 18.2 36.3 16.5 33.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <path
          d="M31 32.8C28.8 31.8 26.7 30.3 25 28.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}


function DetailField({ label, value, tooltipKey }) {
  return (
    <div className="detail-field">
      <span>
        {label}
        {tooltipKey && <InfoTooltip contentKey={tooltipKey} />}
      </span>
      <strong>{value || "—"}</strong>
    </div>
  )
}


function PropertyCard({ label, value, vocabulary, termName }) {
  return (
    <div className="property-card">
      <span>{label}{vocabulary && <InfoIcon vocabulary={vocabulary} termName={termName || value} />}</span>
      <strong>{value || "—"}</strong>
    </div>
  )
}


/* =========================================
   FORMAT ARRAY VALUES
   ========================================= */

function formatArray(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return "—"
  }

  return value.join(", ")
}


/* =========================================
   HERB DETAIL PAGE
   ========================================= */

function HerbDetailPage() {
  const useApi = typeof import.meta.env.VITE_USE_API !== "undefined"
    ? import.meta.env.VITE_USE_API === "true"
    : Boolean(USE_API)
  const t = useUiText()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const [isFavorite, setIsFavorite] = useState(false)
  const [apiHerb, setApiHerb] = useState(null)
  const [apiLoading, setApiLoading] = useState(useApi && Boolean(id))
  const [apiError, setApiError] = useState(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [language, setLanguage] = useState(() => localStorage.getItem('dravyaguna-language') || 'en-IN')

  useEffect(() => {
    if (!useApi) return
    getAccount()
      .then(({ preferred_language: preferred }) => {
        if (preferred) {
          setInterfaceLanguage(preferred)
          setLanguage(preferred)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const syncLanguage = () => setLanguage(localStorage.getItem('dravyaguna-language') || 'en-IN')
    window.addEventListener('dravyaguna-language-change', syncLanguage)
    return () => window.removeEventListener('dravyaguna-language-change', syncLanguage)
  }, [])
  const [translationBusy, setTranslationBusy] = useState(false)
  const [translationMessage, setTranslationMessage] = useState('')
  const canVerifyTranslation = ['admin', 'domain_expert'].includes(getBackendRole(getCurrentUser()))

  const handleVerifyTranslation = async (fieldName) => {
    setTranslationBusy(true)
    setTranslationMessage('')
    try {
      const verified = await verifyTranslation({ contentId: id, fieldName, language })
      setApiHerb((previous) => previous ? {
        ...previous,
        translations: { ...previous.translations, [fieldName]: { ...previous.translations?.[fieldName], status: verified.status } },
      } : previous)
      setTranslationMessage('Translation verified.')
    } catch (error) {
      setApiError(error.message || 'Unable to verify translation.')
    } finally { setTranslationBusy(false) }
  }


  /* =========================================
     LOAD HERB FROM API
     ========================================= */

  useEffect(() => {
    if (useApi && id) {
      setApiLoading(true)
      setApiError(null)
      
      getHerbById(id, language)
        .then(herb => {
          setApiHerb(herb)
          setApiLoading(false)
        })
        .catch(error => {
          console.error('Failed to load herb:', error)
          setApiError(error.message)
          setApiLoading(false)
        })
    }
  }, [id, language])


  /* =========================================
     GET HERB (API or fallback)
     ========================================= */

  const currentHerb = useMemo(() => {
    if (USE_API) {
      return apiHerb
    }
    return herbDataset.find((item) => item.id === id)
  }, [apiHerb, id])

  const herb = currentHerb

  /* =========================================
     RECORD CLINICAL INTERACTION FOR LEARNING
     ========================================= */

  useEffect(() => {
    if (!herb?.id || !useApi) return
    const query = location.state?.searchQuery || herb.sanskritName || herb.englishName
    if (query) {
      recordFeedback({
        queryText: query,
        herbId: herb.id,
        interactionType: 'view',
      })
    }
  }, [herb?.id, location.state?.searchQuery])


  /* =========================================
     CHECK FAVORITE STATUS
     ========================================= */

  useEffect(() => {
    if (!herb) {
      setIsFavorite(false)
      return
    }

    if (USE_API) {
      getFavorites()
        .then(response => {
          const alreadyFavorite = response.data?.some(
            item => item.herb_id === herb.id
          )
          setIsFavorite(Boolean(alreadyFavorite))
        })
        .catch(error => {
          setApiError(error.message)
          setIsFavorite(false)
        })
      return
    }

    const savedFavorites =
      localStorage.getItem("favoriteHerbs")

    if (!savedFavorites) {
      setIsFavorite(false)
      return
    }

    try {
      const favorites = JSON.parse(savedFavorites)

      const alreadyFavorite = favorites.some(
        (item) => item.id === herb.id
      )

      setIsFavorite(alreadyFavorite)
    } catch (error) {
      console.error(
        "Unable to load favorite herbs:",
        error
      )

      setIsFavorite(false)
    }
  }, [id, herb])


  /* =========================================
     ADD / REMOVE FAVORITE
     ========================================= */

  const handleFavorite = async () => {
    if (!herb) return

    if (USE_API) {
      setFavoriteBusy(true)
      try {
        if (isFavorite) {
          await removeFavorite(herb.id)
          setIsFavorite(false)
        } else {
          await addFavorite(herb.id)
          setIsFavorite(true)
          recordFeedback({
            queryText: location.state?.searchQuery || herb.sanskritName || herb.englishName || 'herb',
            herbId: herb.id,
            interactionType: 'favorite',
          })
        }
      } catch (error) {
        setApiError(error.message)
      } finally {
        setFavoriteBusy(false)
      }
      return
    }

    const savedFavorites =
      localStorage.getItem("favoriteHerbs")

    let favorites = []

    if (savedFavorites) {
      try {
        favorites = JSON.parse(savedFavorites)
      } catch (error) {
        console.error(
          "Unable to read favorite herbs:",
          error
        )

        favorites = []
      }
    }

    const alreadyFavorite = favorites.some(
      (item) => item.id === herb.id
    )

    let updatedFavorites

    if (alreadyFavorite) {
      updatedFavorites = favorites.filter(
        (item) => item.id !== herb.id
      )
    } else {
      updatedFavorites = [
        ...favorites,
        herb,
      ]
    }

    localStorage.setItem(
      "favoriteHerbs",
      JSON.stringify(updatedFavorites)
    )

    setIsFavorite(!alreadyFavorite)
  }


  /* =========================================
     LOADING / ERROR / NOT FOUND STATES
     ========================================= */

  if (useApi && apiLoading) {
    return (
      <div className="herb-detail-layout">
        <DashboardNavbar />
        <div className="herb-detail-body">
          <Sidebar />
          <main className="herb-detail-content">
            <div className="herb-detail-inner">
              <p role="status">{t("herbDetailLoading") || "Loading herb profile..."}</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (useApi && apiError && !herb) {
    return (
      <div className="herb-detail-layout">
        <DashboardNavbar />
        <div className="herb-detail-body">
          <Sidebar />
          <main className="herb-detail-content">
            <div className="herb-detail-inner">
              <p role="alert">{apiError}</p>
              <h1>Unable to load herb profile</h1>
              <button
                type="button"
                onClick={() => navigate("/herb-library")}
              >
                Back to Herb Library
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!herb) {
    return (
      <div className="herb-detail-layout">
        <DashboardNavbar />
        <div className="herb-detail-body">
          <Sidebar />
          <main className="herb-detail-content">
            <div className="herb-detail-inner">
              <h1>Herb not found</h1>
              <button
                type="button"
                onClick={() => navigate("/herb-library")}
              >
                Back to Herb Library
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

/* =========================================
     REAL DATA PREPARATION
     ========================================= */

  const regionalNames =
    Array.isArray(herb.regionalNames)
      ? herb.regionalNames.join(", ")
      : herb.regionalNames || "—"


  const rasa = formatArray(herb.rasa)
  const guna = formatArray(herb.guna)


  const dhatu = Array.isArray(herb.dhatu)
    ? herb.dhatu
    : []


  const mala = Array.isArray(herb.mala)
    ? herb.mala
    : []


  const srotas = Array.isArray(herb.srotas)
    ? herb.srotas
    : []


  const karma = Array.isArray(herb.karma)
    ? herb.karma
    : []


  const indications =
    Array.isArray(herb.indications)
      ? herb.indications
      : []


  return (
    <div className="herb-detail-layout">

      <DashboardNavbar />


      <div className="herb-detail-body">

        <Sidebar />


        <main className="herb-detail-content">

          <div className="herb-detail-inner">

            {useApi && apiLoading && (
              <p role="status">{t("herbDetailLoading")}</p>
            )}

            {USE_API && apiError && (
              <p role="alert">{apiError}</p>
            )}


            {/* =========================================
                BACK
                ========================================= */}

            <PageBack fallback="/herb-library" />


            {/* =========================================
                HEADER
                ========================================= */}

            <section className="herb-detail-header">

              <div className="herb-detail-heading">
                <label>
                  Language{' '}
                  <select value={language} onChange={(event) => {
                    setInterfaceLanguage(event.target.value)
                    setLanguage(event.target.value)
                  }} aria-label="Herb content language">
                    <option value="en-IN">English</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="mr-IN">Marathi</option>
                    <option value="sa-IN">Sanskrit</option>
                  </select>
                </label>

                <div className="herb-detail-icon-wrapper">
                  {(herb.imageUrl || herb.image_url) ? <img src={herb.imageUrl || herb.image_url} alt={getHerbDisplayName(herb, language)} className="detail-leaf-icon" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} /> : <LeafIcon />}
                </div>


                <div>

                  <p className="herb-detail-breadcrumb">
                    {t("herbDetailBreadcrumb")}
                  </p>


                  <h1>
                    {getHerbDisplayName(herb, language)}
                  </h1>


                  <em>
                    {getHerbSecondaryName(herb, language) || herb.botanicalName || "—"}
                  </em>

                </div>

              </div>


            </section>


            {/* =========================================
                BASIC INFORMATION
                ========================================= */}

            <section className="herb-basic-section">

              <div className="detail-section-heading">

                <p>
                  HERB IDENTITY
                </p>

                <h2>
                  Basic information
                </h2>

              </div>


              <div className="herb-basic-grid">

                <DetailField
                  label="SANSKRIT NAME"
                  value={herb.sanskritName || herb.sanskrit_name || "—"}
                  tooltipKey="sanskritName"
                />

                <DetailField
                  label="ENGLISH NAME"
                  value={herb.englishName}
                  tooltipKey="herbName"
                />


                <DetailField
                  label="REGIONAL NAMES"
                  value={regionalNames}
                  tooltipKey="regionalNames"
                />


                <DetailField
                  label="BOTANICAL NAME"
                  value={herb.botanicalName}
                  tooltipKey="botanicalName"
                />


                <DetailField
                  label="PART USED"
                  value={herb.translations?.part_used?.text || herb.partUsed}
                  tooltipKey="partUsed"
                />
                {herb.translations?.part_used?.status === 'machine_translated' && <small>Machine-translated</small>}
                {herb.translations?.part_used?.status === 'machine_translated' && canVerifyTranslation && <button type="button" disabled={translationBusy} onClick={() => handleVerifyTranslation('part_used')}>Verify translation</button>}


                <DetailField
                  label="HERB ID"
                  value={herb.id}
                />


                <DetailField
                  label="VERIFICATION STATUS"
                  value={herb.verificationStatus}
                  tooltipKey="reviewHerb"
                />

              </div>
              {herb.description && (
                <p>
                  {herb.translations?.description?.text || herb.description}
                  {herb.translations?.description?.status === 'machine_translated' && <small> Machine-translated</small>}
                  {herb.translations?.description?.translation_unavailable && <small> Translation unavailable; showing original.</small>}
                  {herb.translations?.description?.status === 'machine_translated' && canVerifyTranslation && <button type="button" disabled={translationBusy} onClick={() => handleVerifyTranslation('description')}>Verify translation</button>}
                </p>
              )}
              {translationMessage && <p role="status">{translationMessage}</p>}

              <button
                className={`herb-favorite-button${isFavorite ? " favorite-active" : ""}`}
                type="button"
                onClick={handleFavorite}
                disabled={favoriteBusy}
                aria-pressed={isFavorite}
              >
                <span className="favorite-heart" aria-hidden="true">
                  {isFavorite ? "♥" : "♡"}
                </span>
                {favoriteBusy
                  ? "Saving..."
                  : isFavorite
                    ? t("favoritesSavedHerb")
                    : t("herbDetailFavorite")}
              </button>

            </section>


            {/* =========================================
                AYURVEDIC PROFILE
                ========================================= */}

            <section className="herb-properties-section">

              <div className="detail-section-heading">

                <p>
                  AYURVEDIC PROFILE
                </p>

                <h2>
                  Classical properties
                </h2>
                <InfoIcon herbId={herb.id} lang={language} />

              </div>


              <div className="herb-properties-grid">

                <PropertyCard
                  label="RASA"
                  value={rasa}
                  vocabulary="rasa"
                  termName={herb.rasa}
                />


                <PropertyCard
                  label="GUNA"
                  value={guna}
                  vocabulary="guna"
                  termName={herb.guna}
                />


                <PropertyCard
                  label="VIRYA"
                  value={herb.virya}
                  vocabulary="virya"
                />


                <PropertyCard
                  label="VIPAKA"
                  value={herb.vipaka}
                  vocabulary="vipaka"
                />

              </div>

            </section>


            {/* =========================================
                DOSHA
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  DOSHA AFFINITY
                </p>

                <h2>
                  Dosha actions
                </h2>
                <InfoIcon vocabulary="dosha" termName={Object.keys(herb.dosha || {})} />

              </div>


              <div className="detail-data-grid">

                <PropertyCard
                  label="VATA"
                  value={herb.dosha?.vata}
                />


                <PropertyCard
                  label="PITTA"
                  value={herb.dosha?.pitta}
                />


                <PropertyCard
                  label="KAPHA"
                  value={herb.dosha?.kapha}
                />

              </div>

            </section>


            {/* =========================================
                DHATU
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  DHATU AFFINITY
                </p>

                <h2>
                  Dhatu actions
                </h2>
                <InfoIcon vocabulary="dhatu" termName={Object.keys(herb.dhatu || {})} />

              </div>


              <div className="detail-data-grid">

                {dhatu.length > 0 ? (

                  dhatu.map((item, index) => (

                    <PropertyCard
                      key={`dhatu-${index}`}
                      label={`DHATU ${index + 1}`}
                      value={item}
                    />

                  ))

                ) : (

                  <PropertyCard
                    label="DHATU"
                    value="—"
                  />

                )}

              </div>

            </section>


            {/* =========================================
                MALA
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  MALA AFFINITY
                </p>

                <h2>
                  Mala actions
                </h2>
                <InfoIcon vocabulary="mala" termName={mala.map((item) => typeof item === 'object' ? item.mala : String(item).split('·')[0].trim())} />

              </div>


              <div className="detail-data-grid">

                {mala.length > 0 ? (

                  mala.map((item, index) => {

                    const [name, action] =
                      String(item).split(":")


                    return (
                      <PropertyCard
                        key={`mala-${index}`}
                        label={
                          name
                            ? name.trim().toUpperCase()
                            : `MALA ${index + 1}`
                        }
                        value={
                          action
                            ? action.trim()
                            : item
                        }
                      />
                    )

                  })

                ) : (

                  <PropertyCard
                    label="MALA"
                    value="—"
                  />

                )}

              </div>

            </section>


            {/* =========================================
                SROTAS
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  SROTAS AFFINITY
                </p>

                <h2>
                  Srotas actions
                </h2>
                <InfoIcon vocabulary="srotas" termName={srotas} />

              </div>


              <div className="detail-data-grid srotas-grid">

                {srotas.length > 0 ? (

                  srotas.map((item, index) => (

                    <PropertyCard
                      key={`srotas-${index}`}
                      label={`SROTAS ${index + 1}`}
                      value={item}
                    />

                  ))

                ) : (

                  <PropertyCard
                    label="SROTAS"
                    value="—"
                  />

                )}

              </div>

            </section>


            {/* =========================================
                PRABHAVA
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  SPECIAL ACTION
                </p>

                <h2>
                  Prabhava
                </h2>

              </div>


              <div className="major-disease-card">

                <p>
                  {herb.translations?.prabhava?.text || herb.prabhava || "—"}
                </p>
                {herb.translations?.prabhava?.status === 'machine_translated' && <small>Machine-translated</small>}
                {herb.translations?.prabhava?.status === 'machine_translated' && canVerifyTranslation && <button type="button" disabled={translationBusy} onClick={() => handleVerifyTranslation('prabhava')}>Verify translation</button>}

              </div>

            </section>


            {/* =========================================
                AVAYAVA
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  TARGET ORGANS
                </p>

                <h2>
                  Avayava
                </h2>

              </div>


              <div className="major-disease-card">

                <p>
                  {formatArray(herb.avayava)}
                </p>

              </div>

            </section>


            {/* =========================================
                KARMA
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  THERAPEUTIC ACTIONS
                </p>

                <h2>
                  Karma
                </h2>
                <InfoIcon vocabulary="karma" termName={karma} />

              </div>


              <div className="herb-properties-grid karma-grid">

                <PropertyCard
                  label="KARMA"
                  value={formatArray(karma)}
                />

              </div>

            </section>


            {/* =========================================
                MAJOR DISEASES / INDICATIONS
                ========================================= */}

            <section className="detail-data-section">

              <div className="detail-section-heading">

                <p>
                  CLINICAL INDICATIONS
                </p>

                <h2>
                  Major diseases / indications
                </h2>
                <InfoIcon vocabulary="indication" termName={indications} />

              </div>


              <div className="major-disease-card">

                <p>
                  {formatArray(indications)}
                </p>

              </div>

            </section>


            {/* =========================================
                KNOWLEDGE NOTE
                ========================================= */}

            <section className="herb-detail-note">

              <span>
                i
              </span>


              <div>

                <strong>
                  Knowledge record
                </strong>


                <p>
                  Ayurvedic attributes shown here are
                  structured knowledge fields from the herb
                  knowledge base. The complete record,
                  including classical references and
                  additional source information, will be
                  connected to the underlying dataset during
                  backend integration.
                </p>

              </div>

            </section>


          </div>

        </main>

      </div>

    </div>
  )
}


export default HerbDetailPage
