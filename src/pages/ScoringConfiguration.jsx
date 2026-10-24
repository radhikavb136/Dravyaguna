import { useCallback, useEffect, useState } from "react"
import { getWeights, updateWeights } from "../api/weights"
import { searchHerbs } from "../api/herbs"
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

  const [weights, setWeights] = useState(defaultWeights)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveMessage, setSaveMessage] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [previewText, setPreviewText] = useState("")
  const useApi = import.meta.env.VITE_USE_API === "true"

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
        } else {
          // Fallback to localStorage for mock data
          const savedWeights = JSON.parse(
            localStorage.getItem("scoringWeights") || "null"
          )
          if (savedWeights) {
            setWeights({ ...defaultWeights, ...savedWeights })
          }
        }
      } catch (err) {
        console.error('Failed to load weights:', err)
        setError('Failed to load weights')
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
    },
    {
      key: "guna",
      name: "Guna",
      description: "Quality attributes",
    },
    {
      key: "virya",
      name: "Virya",
      description: "Potency",
    },
    {
      key: "vipaka",
      name: "Vipaka",
      description: "Post-digestive taste",
    },
    {
      key: "prabhava",
      name: "Prabhava",
      description: "Specific action",
    },
    {
      key: "dosha",
      name: "Dosha",
      description: "Dosha affinity",
    },
    {
      key: "dhatu",
      name: "Dhatu",
      description: "Tissue affinity",
    },
    {
      key: "mala",
      name: "Mala",
      description: "Waste-channel affinity",
    },
    {
      key: "srotas",
      name: "Srotas",
      description: "Channel affinity",
    },
    {
      key: "karma",
      name: "Karma",
      description: "Therapeutic actions",
    },
    {
      key: "indication",
      name: "Clinical Indication",
      description: "Indicated conditions",
    },
    {
      key: "avayava",
      name: "Avayava (Organ)",
      description: "No organ data in the dataset yet",
      disabled: true,
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
        setSaveMessage('Scoring configuration saved successfully. The next search uses these weights.')
        await refreshPreview()
      } else {
        // Fallback to localStorage for mock data
        localStorage.setItem(
          "scoringWeights",
          JSON.stringify(weights)
        )
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
            SEARCH ENGINE CONFIGURATION
          </p>

          <h1>
            Scoring Configuration
          </h1>

          <p className="scoring-description">
            Configure how Ayurvedic parameters contribute
            to herb relevance ranking.
          </p>

        </div>

        <div className="scoring-page-actions">
          <button
            className="scoring-button"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>

          <button
            className="scoring-button primary"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
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
      {saveMessage && <p role="status">{saveMessage}</p>}

      {/* =========================================
          LOADING STATE
      ========================================= */}

      {loading && (
        <div className="scoring-loading">
          Loading configuration...
        </div>
      )}

      {/* =========================================
          WEIGHTS TABLE
      ========================================= */}

      {!loading && (
        <div className="scoring-weights-container">

          <table className="scoring-weights-table">

            <thead>
              <tr>
                <th>Parameter</th>
                <th>Description</th>
                <th>Weight</th>
                <th>Percentage</th>
              </tr>
            </thead>

            <tbody>
              {parameters.map((param) => {
                const weight = param.disabled ? (weights[param.key] ?? 0) : (weights[param.key] || 0)
                const percentage = totalPoints > 0 
                  ? ((weight / totalPoints) * 100).toFixed(1) 
                  : 0

                return (
                  <tr key={param.key}>
                    <td>
                      <strong>{param.name}</strong>
                    </td>
                    <td>{param.description}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
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
                    </td>
                    <td>{percentage}%</td>
                  </tr>
                )
              })}
            </tbody>

          </table>

          <div className="scoring-total">
            <strong>Total:</strong> {totalPoints} points
          </div>

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
