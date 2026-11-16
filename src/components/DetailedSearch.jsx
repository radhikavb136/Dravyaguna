import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getFilterOptions } from "../api/vocabulary"
import InfoIcon from "./InfoIcon"
import InfoTooltip from "./InfoTooltip"
import { USE_API } from "../api/client"
import "../styles/DetailedSearch.css"

function DetailedSearch() {
  const [vocabulary, setVocabulary] = useState(null)
  const [vocabularyLoading, setVocabularyLoading] = useState(USE_API)
  const [vocabularyError, setVocabularyError] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  // Load vocabulary from API when feature flag is enabled
  useEffect(() => {
    if (!USE_API) return undefined
    let cancelled = false
    getFilterOptions()
      .then(data => {
        if (!cancelled) setVocabulary(data)
      })
      .catch(error => {
        if (!cancelled) setVocabularyError(error.message || "Unable to load search filters")
      })
      .finally(() => {
        if (!cancelled) setVocabularyLoading(false)
      })
    return () => { cancelled = true }
  }, [retryCount])

  // Hardcoded parameters for fallback when API is disabled
  const hardcodedParameters = [
    {
      title: "Rasa",
      subtitle: "taste profile",
      options: [
        "Madhura",
        "Amla",
        "Lavana",
        "Katu",
        "Tikta",
        "Kashay",
      ],
    },
    {
      title: "Guna",
      subtitle: "qualities",
      options: [
        "Guru",
        "Laghu",
        "Snigdha",
        "Ruksha",
        "Tikshna",
        "Manda",
        "Sthira",
        "Vishada",
      ],
    },
    {
      title: "Virya",
      subtitle: "potency / action",
      options: [
        "Ushna",
        "Sheeta",
      ],
    },
    {
      title: "Vipaka",
      subtitle: "post-digestive effect",
      options: [
        "Madhura",
        "Katu",
        "Amla",
      ],
    },
    {
      title: "Dosha",
      subtitle: "dosha action",
      options: [
        "Vata · Increases",
        "Vata · Decreases",
        "Pitta · Increases",
        "Pitta · Decreases",
        "Kapha · Increases",
        "Kapha · Decreases",
      ],
    },
    {
      title: "Dhatu",
      subtitle: "tissue system",
      options: [
        "Rasa",
        "Rakta",
        "Mamsa",
        "Meda",
        "Asthi",
        "Majja",
        "Shukra",
      ],
    },
    {
      title: "Mala",
      subtitle: "waste pathways",
      options: [
        "Purisha",
        "Mutra",
        "Sweda",
      ],
    },
    {
      title: "Srotas",
      subtitle: "body channels",
      options: [
        "Pranavaha",
        "Annavaha",
        "Udakavaha",
        "Rasavaha",
        "Raktavaha",
        "Mamsavaha",
        "Medovaha",
        "Asthivaha",
        "Majjavaha",
        "Shukravaha",
        "Mutravaha",
        "Swedavaha",
        "Purishavaha",
        "Artavavaha",
      ],
    },
    {
      title: "Karma",
      subtitle: "therapeutic action",
      options: [
        "Rasayana",
        "Balya",
        "Deepana",
        "Pachana",
        "Grahi",
        "Rechana",
        "Virechana",
        "Vamana",
        "Lekhana",
        "Medohara",
        "Shothahara",
        "Vedanasthapana",
        "Kandughna",
        "Kushtaghna",
        "Krimighna",
        "Vajikarana",
        "Mutrala",
        "Hridya",
        "Others",
      ],
    },
    {
      title: "Major Diseases / Indications",
      subtitle: "clinical indications",
      options: [
        "Agnimandya",
        "Ajeerna",
        "Amavata",
        "Amlapitta",
        "Arsha",
        "Ashmari",
        "Atisara",
        "Chardi",
        "Grahani",
        "Jvara",
        "Kasa",
        "Kandu",
        "Krimi Roga",
        "Kushta",
        "Mutra Vikara",
        "Prameha",
        "Rakta Pitta",
        "Sandhi Shoola",
        "Shotha",
        "Shwasa",
        "Udara Roga",
        "Vataroga",
        "Vrana",
      ],
    },
  ]

  // Convert vocabulary API data to the format expected by the component
  const getParameters = () => {
    if (USE_API) {
      if (!vocabulary) return []
      return [
        {
          title: "Rasa",
          subtitle: "taste profile",
          options: (vocabulary.rasa || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "rasa",
          terms: vocabulary.rasa || [],
        },
        {
          title: "Guna",
          subtitle: "qualities",
          options: (vocabulary.guna || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "guna",
          terms: vocabulary.guna || [],
        },
        {
          title: "Virya",
          subtitle: "potency / action",
          options: (vocabulary.virya || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "virya",
          terms: vocabulary.virya || [],
        },
        {
          title: "Vipaka",
          subtitle: "post-digestive effect",
          options: (vocabulary.vipaka || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "vipaka",
          terms: vocabulary.vipaka || [],
        },
        {
          title: "Dosha",
          subtitle: "dosha action",
          options: [
            "Vata · Increases",
            "Vata · Decreases",
            "Pitta · Increases",
            "Pitta · Decreases",
            "Kapha · Increases",
            "Kapha · Decreases",
          ],
          vocabularyKey: "dosha",
        },
        {
          title: "Dhatu",
          subtitle: "tissue system",
          options: (vocabulary.dhatu || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "dhatu",
          terms: vocabulary.dhatu || [],
        },
        {
          title: "Mala",
          subtitle: "waste pathways",
          options: (vocabulary.mala || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "mala",
          terms: vocabulary.mala || [],
        },
        {
          title: "Srotas",
          subtitle: "body channels",
          options: (vocabulary.srotas || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "srotas",
          terms: vocabulary.srotas || [],
        },
        {
          title: "Karma",
          subtitle: "therapeutic action",
          options: (vocabulary.karma || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "karma",
          terms: vocabulary.karma || [],
        },
        {
          title: "Major Diseases / Indications",
          subtitle: "clinical indications",
          options: (vocabulary.indications || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "indication",
          terms: vocabulary.indications || [],
        },
        {
          title: "Organ / Avayava",
          subtitle: "body organs",
          options: (vocabulary.avayava || []).map(t => t.slug || t.canonical_en),
          vocabularyKey: "avayava",
          terms: vocabulary.avayava || [],
          disabled: !vocabulary.hasOrganData,
          disabledMessage: "No data yet",
        },
      ]
    }

    // Fall back to hardcoded options when API is disabled
    return hardcodedParameters
  }

  const parameters = getParameters()

  const navigate = useNavigate()

  const [selectedParameters, setSelectedParameters] = useState({})

  const handleParameterSelect = (parameterTitle, option) => {
    setSelectedParameters((previous) => {
      const currentSelection = previous[parameterTitle] || []

      const alreadySelected = currentSelection.includes(option)

      if (alreadySelected) {
        return {
          ...previous,
          [parameterTitle]: currentSelection.filter(
            (item) => item !== option
          ),
        }
      }

      return {
        ...previous,
        [parameterTitle]: [...currentSelection, option],
      }
    })
  }

  const cleanedSelections = Object.fromEntries(
    Object.entries(selectedParameters).filter(
      ([, options]) => options.length > 0
    )
  )

  const selectedCount = Object.values(cleanedSelections).reduce(
    (total, options) => total + options.length,
    0
  )

  const handleClearAll = () => {
    setSelectedParameters({})
  }

  const handleDetailedSearch = () => {
    if (selectedCount === 0) {
      return
    }

    const encodedSelections = encodeURIComponent(
      JSON.stringify(cleanedSelections)
    )

    navigate(
      `/search-results?mode=detailed&parameters=${encodedSelections}`
    )
  }

  return (
    <section className="detailed-search-section">
      <div className="detailed-search-top">
        <div>
          <p className="detailed-search-label">
            STRUCTURED CLINICAL SEARCH
          </p>

          <div className="selection-search-row">
            <div className="selection-status-top">
              <h3>
                {selectedCount === 0
                  ? "No parameters selected"
                  : `${selectedCount} parameter${
                      selectedCount > 1 ? "s" : ""
                    } selected`}
              </h3>

              <p>
                {selectedCount === 0
                  ? "Select one or more attributes to begin a precise search."
                  : "Your selected Ayurvedic parameters will be used to rank matching herbs."}
              </p>
            </div>

            <button
              className="detailed-search-button"
              type="button"
              disabled={selectedCount === 0}
              onClick={handleDetailedSearch}
            >
              Search herbs
            </button>
          </div>

          <h2>
            Refine the herb profile
            <InfoTooltip contentKey="advancedSearch" />
          </h2>

          <p className="detailed-search-description">
            Choose as many parameters as needed. Results will be ranked
            by the strength of the match.
          </p>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <button
            className="clear-all-button"
            type="button"
            onClick={handleClearAll}
          >
            Clear all
          </button>
          <InfoTooltip contentKey="clearFilters" />
        </div>
      </div>

      {USE_API && vocabularyLoading ? (
        <p role="status">Loading search filters...</p>
      ) : USE_API && vocabularyError ? (
        <div role="alert">
          <p>Unable to load search filters: {vocabularyError}</p>
          <button type="button" onClick={() => { setVocabularyLoading(true); setVocabularyError(""); setRetryCount(count => count + 1) }}>Retry</button>
        </div>
      ) : <div className="parameter-grid">
        {parameters.map((parameter) => (
          <div
            className="parameter-wrapper"
            key={parameter.title}
          >
            <h3 className="parameter-title">
              {parameter.title}
              <InfoTooltip vocabulary={parameter.vocabularyKey || parameter.title.toLowerCase()} />
            </h3>

            <fieldset className={`parameter-card ${parameter.disabled ? 'disabled' : ''}`}>
              <p className="parameter-subtitle">
                {parameter.subtitle}
                {parameter.disabled && ` (${parameter.disabledMessage})`}
              </p>

              <div className="parameter-options">
                {parameter.options.map((option) => {
                  const isSelected =
                    selectedParameters[parameter.title]?.includes(
                      option
                    )
                  const term = parameter.terms?.find((item) => item.slug === option || item.canonical_en === option)

                  return (
                    <span className="parameter-option-with-info" key={option}>
                    <button
                      type="button"
                      className={`parameter-chip ${
                        isSelected ? "selected" : ""
                      } ${parameter.disabled ? 'disabled' : ''}`}
                      onClick={() =>
                        !parameter.disabled && handleParameterSelect(
                          parameter.title,
                          option
                        )
                      }
                      disabled={parameter.disabled}
                    >
                      {option}
                    </button>
                    <InfoIcon
                      vocabulary={parameter.vocabularyKey}
                      termName={term?.canonical_en || option}
                      definition={term?.definition_en || ""}
                      definitionStatus={term?.definition_status || "draft"}
                    />
                    </span>
                  )
                })}
              </div>
            </fieldset>
          </div>
        ))}
      </div>}
    </section>
  )
}

export default DetailedSearch
