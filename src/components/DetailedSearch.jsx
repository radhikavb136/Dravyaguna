import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getFilterOptions } from "../api/vocabulary"
import { USE_API } from "../api/client"
import "../styles/DetailedSearch.css"

function DetailedSearch() {
  const [vocabulary, setVocabulary] = useState(null)
  const [loadingVocabulary, setLoadingVocabulary] = useState(false)

  // Load vocabulary from API when feature flag is enabled
  useEffect(() => {
    if (USE_API) {
      setLoadingVocabulary(true)
      getFilterOptions()
        .then(data => {
          setVocabulary(data)
          setLoadingVocabulary(false)
        })
        .catch(error => {
          console.error('Failed to load vocabulary:', error)
          setLoadingVocabulary(false)
        })
    }
  }, [])

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
    if (USE_API && vocabulary) {
      return [
        {
          title: "Rasa",
          subtitle: "taste profile",
          options: vocabulary.rasa.map(t => t.canonical_en),
        },
        {
          title: "Guna",
          subtitle: "qualities",
          options: vocabulary.guna.map(t => t.canonical_en),
        },
        {
          title: "Virya",
          subtitle: "potency / action",
          options: vocabulary.virya.map(t => t.canonical_en),
        },
        {
          title: "Vipaka",
          subtitle: "post-digestive effect",
          options: vocabulary.vipaka.map(t => t.canonical_en),
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
          options: vocabulary.dhatu.map(t => t.canonical_en),
        },
        {
          title: "Mala",
          subtitle: "waste pathways",
          options: vocabulary.mala.map(t => t.canonical_en),
        },
        {
          title: "Srotas",
          subtitle: "body channels",
          options: vocabulary.srotas.map(t => t.canonical_en),
        },
        {
          title: "Karma",
          subtitle: "therapeutic action",
          options: vocabulary.karma.map(t => t.canonical_en),
        },
        {
          title: "Major Diseases / Indications",
          subtitle: "clinical indications",
          options: vocabulary.indications.map(t => t.canonical_en),
        },
        {
          title: "Organ / Avayava",
          subtitle: "body organs",
          options: vocabulary.avayava.map(t => t.canonical_en),
          disabled: !vocabulary.hasOrganData,
          disabledMessage: "No data yet",
        },
      ]
    }

    // Fall back to hardcoded options when API is disabled
    return hardcodedParameters
  }

  const parameters = getParameters()
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

          <h2>Refine the herb profile</h2>

          <p className="detailed-search-description">
            Choose as many parameters as needed. Results will be ranked
            by the strength of the match.
          </p>
        </div>

        <button
          className="clear-all-button"
          type="button"
          onClick={handleClearAll}
        >
          Clear all
        </button>
      </div>

      <div className="parameter-grid">
        {parameters.map((parameter) => (
          <div
            className="parameter-wrapper"
            key={parameter.title}
          >
            <h3 className="parameter-title">
              {parameter.title}
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

                  return (
                    <button
                      key={option}
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
                  )
                })}
              </div>
            </fieldset>
          </div>
        ))}
      </div>
    </section>
  )
}

export default DetailedSearch