import InfoTooltip from "./InfoTooltip"

/**
 * InfoIcon component - backward-compatible wrapper for InfoTooltip
 * Renders an accessible circular (ⓘ) information icon with contextual tooltip.
 */
export default function InfoIcon(props) {
  return <InfoTooltip {...props} />
}
