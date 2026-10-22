import { describe, expect, it } from "vitest"
import { formatApiNetworkError } from "./client"

describe("API network error text", () => {
  it("shows the attempted base URL and points to the active origin for possible CORS blocks", () => {
    const message = formatApiNetworkError(
      "http://localhost:4000/?token=must-not-appear",
      new TypeError("Failed to fetch"),
      "http://localhost:5180"
    )
    expect(message).toContain("http://localhost:4000")
    expect(message).toContain("No response")
    expect(message).toContain("CORS block for http://localhost:5180")
    expect(message).not.toContain("must-not-appear")
  })

  it("does not label a same-origin failure as CORS", () => {
    const message = formatApiNetworkError(
      "http://localhost:4000",
      new TypeError("Failed to fetch"),
      "http://localhost:4000"
    )
    expect(message).toContain("Check that the backend is running")
    expect(message).not.toContain("CORS block")
  })
})
