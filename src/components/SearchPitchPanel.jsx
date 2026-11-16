import { useMemo, useState } from "react"
import "../styles/SearchPitchPanel.css"

/**
 * Phase 8 pitch UX — grounded only in search results / API meta (no fabricated clinical text).
 */
function SearchPitchPanel({ query, results = [], meta = {}, activeFilters = {} }) {
  const [plainLanguage, setPlainLanguage] = useState(false)
  const [focusHerbId, setFocusHerbId] = useState(null)

  const focusHerb = useMemo(
    () => results.find((herb) => herb.id === focusHerbId) || null,
    [focusHerbId, results]
  )

  const similarByKarma = useMemo(() => {
    if (!focusHerb || !Array.isArray(focusHerb.karma) || !focusHerb.karma.length) return []
    const set = new Set(focusHerb.karma.map((k) => String(k).toLowerCase()))
    return results
      .filter((herb) => herb.id !== focusHerb.id)
      .map((herb) => {
        const shared = (herb.karma || []).filter((k) => set.has(String(k).toLowerCase()))
        return { herb, shared }
      })
      .filter((row) => row.shared.length > 0)
      .sort((a, b) => b.shared.length - a.shared.length)
      .slice(0, 3)
  }, [focusHerb, results])

  const whyNotLines = useMemo(() => {
    if (!focusHerb) return []
    const lines = []
    const pct = focusHerb.match ?? focusHerb.matchPercentage
    if (pct != null) {
      lines.push(`Match score for your current search: ${pct}%.`)
    }
    if (Array.isArray(focusHerb.breakdown) && focusHerb.breakdown.length) {
      const missed = focusHerb.breakdown.filter((row) => row && row.matched === false)
      if (missed.length) {
        lines.push(
          `Parameters without a match in this herb record: ${missed.map((r) => r.parameter).join(", ")}.`
        )
      }
    }
    if (meta?.unmatched_tokens?.length) {
      lines.push(`Unmatched query tokens: ${meta.unmatched_tokens.join(", ")}.`)
    }
    const filterKeys = Object.entries(activeFilters || {}).filter(
      ([, value]) => Array.isArray(value) && value.length > 0
    )
    if (filterKeys.length) {
      lines.push(
        `Active filters: ${filterKeys.map(([key, value]) => `${key}: ${value.join(", ")}`).join("; ")}.`
      )
    }
    if (!lines.length) {
      lines.push("No additional filter mismatch data is available for this herb in the current result set.")
    }
    return lines
  }, [focusHerb, meta, activeFilters])

  const verifiedCautions = useMemo(() => {
    if (!focusHerb?.cautions?.length) return []
    return focusHerb.cautions.filter(
      (item) => item && (item.verification_status === "verified" || item.status === "verified")
    )
  }, [focusHerb])

  if (!results.length) return null

  return (
    <section className="search-pitch-panel" aria-label="Search insights">
      <div className="search-pitch-toolbar">
        <label className="search-pitch-toggle">
          <input
            type="checkbox"
            checked={plainLanguage}
            onChange={(event) => setPlainLanguage(event.target.checked)}
          />
          Plain-language labels (expert-verified definitions only)
        </label>
        {meta?.name_search && (
          <p className="search-pitch-note" role="status">
            Name search matched stored English, botanical, Sanskrit, or local names in the database.
          </p>
        )}
      </div>

      <div className="search-pitch-why">
        <p className="search-pitch-label">Why not this herb?</p>
        <p className="search-pitch-hint">
          {query?.trim()
            ? `For “${query.trim()}”: select a result card to see filter-based gaps (not clinical advice).`
            : "Select a result card to see filter-based gaps (not clinical advice)."}
        </p>
        <div className="search-pitch-herb-picker">
          {results.slice(0, 8).map((herb) => (
            <button
              key={herb.id}
              type="button"
              className={`search-pitch-herb-chip ${focusHerbId === herb.id ? "active" : ""}`}
              onClick={() => setFocusHerbId(herb.id)}
            >
              {herb.englishName || herb.english_name || herb.code}
            </button>
          ))}
        </div>
        {focusHerb && (
          <ul className="search-pitch-why-list">
            {whyNotLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      {focusHerb && similarByKarma.length > 0 && (
        <div className="search-pitch-similar">
          <p className="search-pitch-label">Similar Karma (similarity only — not a recommendation)</p>
          <ul>
            {similarByKarma.map(({ herb, shared }) => (
              <li key={herb.id}>
                {herb.englishName || herb.english_name}: shared {shared.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plainLanguage && focusHerb && (
        <div className="search-pitch-plain" role="status">
          <p>
            Verified-definition plain language is shown only when the API marks a field as expert-verified.
            Machine translations and unverified labels stay unchanged.
          </p>
          {verifiedCautions.length > 0 ? (
            <ul>
              {verifiedCautions.map((item, index) => (
                <li key={`caution-${index}`}>{item.text || item.label}</li>
              ))}
            </ul>
          ) : (
            <p>No expert-verified caution text is attached to this herb record.</p>
          )}
        </div>
      )}
    </section>
  )
}

export default SearchPitchPanel
