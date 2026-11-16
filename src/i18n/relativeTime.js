export function interpolate(template, vars = {}) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  )
}

export function formatRelativeTime(t, date) {
  if (!date) {
    return t("timeNoDate")
  }

  const timestamp = new Date(date).getTime()

  if (Number.isNaN(timestamp)) {
    return t("timeNoDate")
  }

  const difference = Date.now() - timestamp
  const minutes = Math.floor(difference / (1000 * 60))

  if (minutes < 1) {
    return t("timeJustNow")
  }

  if (minutes < 60) {
    return interpolate(t("timeMinAgo"), { count: minutes })
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return interpolate(t("timeHrAgo"), { count: hours })
  }

  const days = Math.floor(hours / 24)

  if (days === 1) {
    return t("timeYesterday")
  }

  if (days < 7) {
    return interpolate(t("timeDaysAgo"), { count: days })
  }

  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
