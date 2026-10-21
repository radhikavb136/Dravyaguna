import { useId, useState } from 'react'
import { explainHerb } from '../api/explain'
import { getTermDefinitions } from '../api/vocabulary'
import { USE_API } from '../api/client'
import './InfoIcon.css'

function InfoIcon({ termName, vocabulary, definition = '', definitionStatus = 'draft', herbId, filters = {}, lang = 'en-IN' }) {
  const id = useId()
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [termDefinitions, setTermDefinitions] = useState([])
  const [explanation, setExplanation] = useState(null)
  const [tooltipDefinition, setTooltipDefinition] = useState(definition)
  const [tooltipStatus, setTooltipStatus] = useState(definitionStatus)
  const [definitionLoaded, setDefinitionLoaded] = useState(Boolean(definition))

  const names = (Array.isArray(termName) ? termName : [termName]).filter(Boolean)
  const summary = tooltipDefinition
    ? `${tooltipStatus === 'verified' ? '' : 'Draft definition: '}${tooltipDefinition}`
    : 'Definition coming soon.'

  const loadTermDefinition = async () => {
    if (!USE_API || !vocabulary || !names.length || definitionLoaded) return
    try {
      const terms = await getTermDefinitions(vocabulary, names)
      setTermDefinitions(terms)
      const available = terms.filter((term) => term.definition)
      setTooltipDefinition(available.map((term) => term.definition).join(' '))
      if (available.length) setTooltipStatus(available.every((term) => term.status === 'verified') ? 'verified' : 'draft')
    } catch {
      // The panel exposes the real request error when the user asks to view more.
    } finally {
      setDefinitionLoaded(true)
    }
  }

  const openMore = async () => {
    setPanelOpen(true)
    setError('')
    if (!USE_API) return
    setLoading(true)
    try {
      if (herbId) {
        setExplanation(await explainHerb({ herbId, filters, lang }))
      } else if (vocabulary && names.length) {
        setTermDefinitions(await getTermDefinitions(vocabulary, names))
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load information')
    } finally {
      setLoading(false)
    }
  }

  const close = () => {
    setPanelOpen(false)
    setTooltipOpen(false)
  }

  return (
    <span
      className={`info-icon-root${tooltipOpen ? ' is-open' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close()
      }}
    >
      <button
        className="info-icon-trigger"
        type="button"
        aria-label={herbId ? 'More information about this herb' : `Definition for ${names.join(', ') || vocabulary || 'this term'}`}
        aria-expanded={tooltipOpen || panelOpen}
        aria-describedby={`${id}-tooltip`}
        onFocus={loadTermDefinition}
        onClick={() => setTooltipOpen((open) => !open)}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span className="info-icon-tooltip" id={`${id}-tooltip`} role="tooltip" onMouseEnter={loadTermDefinition}>
        {herbId ? 'View retrieved herb information and scoring.' : summary}
        <button type="button" onClick={openMore}>View more</button>
      </span>

      {panelOpen && (
        <div className="info-icon-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <section className="info-icon-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
            <button className="info-icon-close" type="button" aria-label="Close information" onClick={close}>×</button>
            <h2 id={`${id}-title`}>{herbId ? 'Herb explanation' : names.join(', ') || vocabulary}</h2>
            {loading && <p role="status">Loading information…</p>}
            {error && <p role="alert">{error}</p>}

            {herbId && explanation && (
              <>
                {explanation.ai_generated ? (
                  <p className="info-icon-generated-label">
                    AI-generated{explanation.provider === 'mock' ? ' (mock provider)' : ''}
                  </p>
                ) : null}
                {explanation.explanation && <p>{explanation.explanation}</p>}
                {explanation.explanation_unavailable && <p>{explanation.message}</p>}
                {explanation.citations?.length > 0 && (
                  <div>
                    <strong>References</strong>
                    <ul>{explanation.citations.map((citation, index) => (
                      <li key={`${citation.source}-${index}`}>
                        {[citation.source, citation.chapter, citation.verse, citation.notes].filter(Boolean).join(' · ')}
                      </li>
                    ))}</ul>
                  </div>
                )}
                {explanation.structured?.breakdown?.length > 0 && (
                  <div>
                    <strong>Scoring details</strong>
                    <ul>{explanation.structured.breakdown.map((item) => (
                      <li key={item.group}>{item.group}: {Math.round(Number(item.ratio || 0) * 100)}%</li>
                    ))}</ul>
                  </div>
                )}
              </>
            )}

            {!herbId && (termDefinitions.length > 0 ? termDefinitions.map((term) => (
              <div key={term.name}>
                {term.definition ? (
                  <>
                    <p className="info-icon-definition-status">{term.status === 'verified' ? 'Expert verified' : 'Draft — awaiting expert review'}</p>
                    <p>{term.definition}</p>
                  </>
                ) : <p>Definition coming soon.</p>}
              </div>
            )) : (!loading && <p>{definition || 'Definition coming soon.'}</p>))}
          </section>
        </div>
      )}
    </span>
  )
}

export default InfoIcon
