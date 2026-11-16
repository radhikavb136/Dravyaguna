import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { getTooltipInfo, TOOLTIP_CONTENT } from "../constants/tooltipContent"
import "./InfoTooltip.css"

export default function InfoTooltip({
  contentKey,
  title: propTitle,
  text: propText,
  vocabulary,
  termName,
  definition,
  label,
  children,
  placement = "auto",
  className = "",
  size = 14,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, actualPlacement: "top", arrowLeft: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const tooltipId = useId()

  // Resolve content from dictionary, props, or vocabulary fallback
  let resolvedTitle = propTitle
  let resolvedText = propText || definition

  if (!resolvedText && contentKey) {
    const info = getTooltipInfo(contentKey)
    if (info) {
      resolvedTitle = resolvedTitle || info.title
      resolvedText = info.text
    }
  }

  // Handle vocabulary/termName props passed from existing components
  if (!resolvedText && vocabulary) {
    const vocabKey = String(vocabulary).toLowerCase().trim()
    const vocabInfo = TOOLTIP_CONTENT[vocabKey]
    if (vocabInfo) {
      resolvedTitle = resolvedTitle || vocabInfo.title
      resolvedText = vocabInfo.text
    } else if (termName) {
      resolvedTitle = resolvedTitle || (typeof termName === "string" ? termName : "Ayurvedic Property")
      resolvedText = `Ayurvedic clinical property classification for ${typeof termName === "string" ? termName : "this herb"}.`
    }
  }

  // Fallback text if still empty
  if (!resolvedText && !children) {
    resolvedText = "Contextual information and guidance for this section."
  }

  // Compute position relative to viewport
  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = Math.min(270, window.innerWidth - 24)
    const tooltipHeightEstimate = 90

    // Determine top vs bottom placement
    let chosenPlacement = placement
    if (placement === "auto") {
      chosenPlacement = rect.top >= tooltipHeightEstimate + 16 ? "top" : "bottom"
    }

    // Calculate clamped horizontal position
    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left))

    // Calculate vertical position
    let top = 0
    if (chosenPlacement === "top") {
      top = rect.top - 8
    } else {
      top = rect.bottom + 8
    }

    // Calculate relative arrow position
    const arrowLeft = Math.max(14, Math.min(tooltipWidth - 14, rect.left + rect.width / 2 - left))

    setCoords({
      top,
      left,
      actualPlacement: chosenPlacement,
      arrowLeft,
    })
  }

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    updatePosition()
    setIsOpen(true)
  }

  const handleClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOpen) {
      setIsOpen(false)
    } else {
      handleOpen()
    }
  }

  // Close on outside clicks or window resize/scroll
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        tooltipRef.current?.contains(e.target)
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      updatePosition()
    }

    document.addEventListener("pointerdown", handleOutsideClick, true)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
    }
  }, [isOpen])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const tooltipPortal = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`info-tooltip-bubble ${coords.actualPlacement}`}
          style={{
            top: coords.actualPlacement === "top" ? `${coords.top}px` : `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.actualPlacement === "top" ? "translateY(-100%)" : "none",
          }}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <div
            className="info-tooltip-arrow"
            style={{ left: `${coords.arrowLeft}px` }}
          />

          {resolvedTitle && (
            <strong className="info-tooltip-title">{resolvedTitle}</strong>
          )}

          {resolvedText && (
            <p className="info-tooltip-text">{resolvedText}</p>
          )}

          {children}
        </div>,
        document.body
      )
    : null

  return (
    <span className={`info-tooltip-wrapper ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger"
        aria-label={label || resolvedTitle || "Information"}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {tooltipPortal}
    </span>
  )
}
