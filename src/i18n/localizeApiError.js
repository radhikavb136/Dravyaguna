import { uiMessages } from "./messages"

const MESSAGE_TO_KEY = {}

for (const [key, value] of Object.entries(uiMessages["en-IN"])) {
  if (
    typeof value === "string" &&
    (key.endsWith("LoadError") ||
      key.endsWith("ApiError") ||
      key === "compareLoadError" ||
      key.startsWith("apiErrorMap"))
  ) {
    MESSAGE_TO_KEY[value] = key
  }
}

const MESSAGE_ALIASES = {
  "Failed to load herbs": "manageHerbsLoadError",
  "Failed to load weights": "scoringLoadError",
  "Failed to load analytics": "analyticsLoadError",
  "Failed to load favorites": "favoritesLoadError",
  "Unable to load saved searches": "favoritesSearchesLoadError",
  "Unable to load favorite status": "favoritesLoadError",
  "Search could not be completed. Try again.": "searchResApiError",
  "Support request not found": "adminSupportNotFound",
  "Invalid support request id": "adminSupportInvalidId",
}

export function localizeApiError(t, message) {
  if (!message || typeof message !== "string") {
    return message
  }

  const key = MESSAGE_ALIASES[message] || MESSAGE_TO_KEY[message]
  if (key) {
    return t(key)
  }

  return message
}
