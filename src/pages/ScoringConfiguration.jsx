import { useCallback, useEffect, useState } from "react"
import { getWeights, updateWeights } from "../api/weights"
import { searchHerbs } from "../api/herbs"
import { localizeApiError } from "../i18n/localizeApiError"
import { useUiText } from "../i18n/useUiText"
import "../styles/ScoringConfiguration.css"

const defaultWeights = {
  rasa: 20,
  guna: 18,
  virya: 12,
  vipaka: 10,
  prabhava: 8,
  dosha: 15,
  dhatu: 6,
  mala: 3,
  srotas: 8,
  karma: 10,
  indication: 15,
}

function ScoringConfiguration() {
  const t = useUiText()

  const [weights, setWeights] = useState(defaultWeights)
  const [initialWeights, setInitialWeights] = useState(defaultWeights)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveMessage, setSaveMessage] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [previewText, setPreviewText] = useState("")
  const useApi = import.meta.env.VITE_USE_API === "true"

  const hasUnsavedChanges = JSON.stringify(weights) !== JSON.stringify(initialWeights)

  // =====================================================
  // LOAD WEIGHTS FROM API
  // =====================================================

  useEffect(() => {
    const loadWeights = async () => {
      try {
        const useApi = import.meta.env.VITE_USE_API === 'true'

        if (useApi) {
          const response = await getWeights()
          setWeights(response.weights)
          setInitialWeights(response.weights)
        } else {
          // Fallback to localStorage for mock data
          const savedWeights = JSON.parse(
            localStorage.getItem("scoringWeights") || "null"
          )
          if (savedWeights) {
            setWeights({ ...defaultWeights, ...savedWeights })
            setInitialWeights({ ...defaultWeights, ...savedWeights })
          } else {
            setInitialWeights(defaultWeights)
          }
        }
      } catch (err) {
        console.error('Failed to load weights:', err)
        setError(localizeApiError(t, t("scoringLoadError")))
      } finally {
        setLoading(false)
      }
    }

    loadWeights()
  }, [])

  // =====================================================
  // PARAMETERS
  // =====================================================

  const parameters = [
    {
      key: "rasa",
      name: "Rasa",
      description: "Taste parameters",
      helpText: t("scoringHelpRasa"),
      coverage: "89% of herbs",
    },
    {
      key: "guna",
      name: "Guna",
      description: "Quality attributes",
      helpText: t("scoringHelpGuna"),
      coverage: "76% of herbs",
    },
    {
      key: "virya",
      name: "Virya",
      description: "Potency",
      helpText: t("scoringHelpVirya"),
      coverage: "82% of herbs",
    },
    {
      key: "vipaka",
      name: "Vipaka",
      description: "Post-digestive taste",
      helpText: t("scoringHelpVipaka"),
      coverage: "71% of herbs",
    },
    {
      key: "prabhava",
      name: "Prabhava",
      description: "Specific action",
      helpText: t("scoringHelpPrabhava"),
      coverage: "45% of herbs",
    },
    {
      key: "dosha",
      name: "Dosha",
      description: "Dosha affinity",
      helpText: t("scoringHelpDosha"),
      coverage: "68% of herbs",
    },
    {
      key: "dhatu",
      name: "Dhatu",
      description: "Tissue affinity",
      helpText: t("scoringHelpDhatu"),
      coverage: "54% of herbs",
    },
    {
      key: "mala",
      name: "Mala",
      description: "Waste-channel affinity",
      helpText: t("scoringHelpMala"),
      coverage: "38% of herbs",
    },
    {
      key: "srotas",
      name: "Srotas",
      description: "Channel affinity",
      helpText: t("scoringHelpSrotas"),
      coverage: "41% of herbs",
    },
    {
      key: "karma",
      name: "Karma",
      description: "Therapeutic actions",
      helpText: t("scoringHelpKarma"),
      coverage: "63% of herbs",
    },
    {
      key: "indication",
      name: "Clinical Indication",
      description: "Indicated conditions",
      helpText: t("scoringHelpIndication"),
      coverage: "57% of herbs",
    },
    {
      key: "avayava",
      name: "Avayava (Organ)",
      description: "No organ data in the dataset yet",
      disabled: true,
      coverage: "0% of herbs",
    },
  ]

  const refreshPreview = useCallback(async () => {
    if (!useApi) {
      setPreviewText("Connect the API to preview live search scoring.")
      return
    }
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const { results } = await searchHerbs(
        { rasa: ["tikta"], karma: ["deepana"] },
        { limit: 100 }
      )
      const sample =
        results.find((herb) => herb.code === "HERB_REC_0010") ||
        results.find((herb) => herb.code === "HERB_REC_0023") ||
        results[0]
      if (!sample) {
        setPreviewText("No herbs matched the example filters (Tikta + Deepana).")
        return
      }
      const pct = sample.matchPercentage ?? sample.match ?? 0
      setPreviewText(`${sample.code} (${sample.englishName || sample.english_name}): ${pct}% match for Tikta + Deepana with saved server weights.`)
    } catch (err) {
      setPreviewError(err?.status === 403 ? err.message : (err.message || "Unable to load preview search"))
      setPreviewText("")
    } finally {
      setPreviewLoading(false)
    }
  }, [useApi])

  useEffect(() => {
    if (!loading) {
      refreshPreview()
    }
  }, [loading, refreshPreview])

  // =====================================================
  // TOTAL WEIGHT
  // =====================================================

  const totalPoints =
    Object.values(weights).reduce(
      (total, value) =>
        total + Number(value || 0),
      0
    )

  // =====================================================
  // WEIGHT CHANGE
  // =====================================================

  const handleWeightChange = (
    key,
    value
  ) => {

    setWeights(
      (previous) => ({
        ...previous,
        [key]: Number(value),
      })
    )
  }

  // =====================================================
  // RESET
  // =====================================================

  const handleReset = async () => {
    const useApi = import.meta.env.VITE_USE_API === 'true'
    
    if (useApi) {
      setWeights(defaultWeights)
      setSaveMessage('Defaults loaded. Save configuration to apply them.')
    } else {
      setWeights(defaultWeights)
      localStorage.removeItem("scoringWeights")
    }
  }

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveMessage("")

    try {
      const useApi = import.meta.env.VITE_USE_API === 'true'

      if (useApi) {
        const response = await updateWeights(weights)
        setWeights(response.weights)
        setInitialWeights(response.weights)
        setSaveMessage('Scoring configuration saved successfully. The next search uses these weights.')
        await refreshPreview()
      } else {
        // Fallback to localStorage for mock data
        localStorage.setItem(
          "scoringWeights",
          JSON.stringify(weights)
        )
        setInitialWeights(weights)
        setSaveMessage('Scoring configuration saved successfully.')
      }
    } catch (err) {
      console.error('Failed to save weights:', err)
      setError(err.message || 'Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="scoring-page">

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="scoring-page-header">

        <div>

          <p className="scoring-label">
            PARAMETER WEIGHTS
          </p>

          <h1>
            {t("scoringTitle")}
          </h1>

          <p className="scoring-description">
            {t("scoringSubtitle")}
          </p>

        </div>

        <div className="scoring-page-header-right">
          <div className="scoring-total-display">
            <span className="scoring-total-label">Total Points</span>
            <span className="scoring-total-value">{totalPoints}</span>
          </div>
          <button
            className="scoring-button"
            onClick={handleReset}
            disabled={loading}
          >
            {t("scoringResetDefaults")}
          </button>

          <button
            className="scoring-button primary"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : t("scoringSave")}
          </button>
        </div>

      </div>

      {/* =========================================
          ERROR MESSAGE
      ========================================= */}

      {error && (
        <div className="scoring-error" role="alert">
          {error}
        </div>
      )}
      {saveMessage && <div className="scoring-success" role="status">{saveMessage}</div>}

      {hasUnsavedChanges && (
        <div className="scoring-warning" role="alert">
          You have unsaved changes. Click "Save Configuration" to apply them.
        </div>
      )}

      {/* =========================================
          LOADING STATE
      ========================================= */}

      {loading && (
        <div className="scoring-loading">
          Loading configuration...
        </div>
      )}

      {/* =========================================
          PARAMETER ROWS
      ========================================= */}

      {!loading && (
        <div className="scoring-parameters-container">

          {parameters.map((param) => {
            const weight = param.disabled ? (weights[param.key] ?? 0) : (weights[param.key] || 0)
            const percentage = totalPoints > 0
              ? ((weight / totalPoints) * 100).toFixed(1)
              : 0

            return (
              <div key={param.key} className="scoring-parameter-row">
                <div className="scoring-param-left">
                  <div className="scoring-param-name">{param.name}</div>
                  <div className="scoring-param-description">{param.description}</div>
                  <div className="scoring-param-coverage">{param.coverage}</div>
                </div>
                <div className="scoring-param-center">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weight}
                    disabled={param.disabled}
                    title={param.disabled ? "Organ (Avayava) data is not available yet." : undefined}
                    onChange={(e) =>
                      handleWeightChange(
                        param.key,
                        e.target.value
                      )
                    }
                    className="scoring-slider"
                  />
                </div>
                <div className="scoring-param-right">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={weight}
                    disabled={param.disabled}
                    title={param.disabled ? "Organ (Avayava) data is not available yet." : undefined}
                    onChange={(e) =>
                      handleWeightChange(
                        param.key,
                        e.target.value
                      )
                    }
                    className="scoring-weight-input"
                  />
                  <div className="scoring-percentage">{percentage}%</div>
                </div>
              </div>
            )
          })}

          <div className="scoring-preview" role="status">
            <strong>Live example (saved weights):</strong>
            {previewLoading ? " Running preview search…" : (previewError ? previewError : previewText)}
          </div>

        </div>
      )}

    </div>
  )
}

export default ScoringConfiguration
