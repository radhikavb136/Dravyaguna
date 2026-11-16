import { describe, expect, it, beforeEach } from "vitest"
import { formatApiNetworkError, apiClient, shouldRedirectToAuthOn401 } from "./client"

describe("apiClient token storage", () => {
  beforeEach(() => {
    localStorage.clear()
    apiClient.clearToken()
  })

  it("drops in-memory token when localStorage auth_token is cleared", () => {
    apiClient.setToken("session-a")
    localStorage.removeItem("auth_token")
    expect(apiClient.getToken()).toBe(null)
  })
})

describe("401 redirect guard", () => {
  it("keeps password-reset and landing public while redirecting protected routes", () => {
    expect(shouldRedirectToAuthOn401("/password-reset")).toBe(false)
    expect(shouldRedirectToAuthOn401("/")).toBe(false)
    expect(shouldRedirectToAuthOn401("/auth")).toBe(false)
    expect(shouldRedirectToAuthOn401("/doctor")).toBe(true)
    expect(shouldRedirectToAuthOn401("/favorites")).toBe(true)
  })
})

describe("API network error text", () => {
  it("shows the attempted base URL and points to the active origin for possible CORS blocks", () => {
    const message = formatApiNetworkError(
      "http://localhost:4000/?token=must-not-appear",
      new TypeError("Failed to fetch"),
      "http://localhost:5180"
    )
    expect(message).toContain("Unable to connect to the server")
    expect(message).toContain("CORS block for http://localhost:5180")
    expect(message).not.toContain("must-not-appear")
    expect(message).not.toContain("http://localhost:4000") // Don't expose technical URL
  })

  it("does not label a same-origin failure as CORS", () => {
    const message = formatApiNetworkError(
      "http://localhost:4000",
      new TypeError("Failed to fetch"),
      "http://localhost:4000"
    )
    expect(message).toContain("Unable to connect to the server")
    expect(message).toContain("Check that the backend is running")
    expect(message).not.toContain("CORS block")
  })
})
