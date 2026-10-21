import { useEffect, useState } from "react"
import { getWeights, updateWeights } from "../api/weights"
import "../styles/ScoringConfiguration.css"

function ScoringConfiguration() {

  // =====================================================
  // DEFAULT WEIGHTS
  // =====================================================

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

  const [weights, setWeights] = useState(defaultWeights)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveMessage, setSaveMessage] = useState("")

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
  ]

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
        setSaveMessage('Scoring configuration saved successfully.')
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
                const weight = weights[param.key] || 0
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

        </div>
      )}

    </div>
  )
}

export default ScoringConfiguration
