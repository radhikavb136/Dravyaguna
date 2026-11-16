import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiClient } from "./client.js"
import { getSearchAnalytics, getSearchAnalyticsInsights } from "./admin.js"

describe("search analytics API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("uses shared apiClient paths (no separate analytics base URL)", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: [] })

    await getSearchAnalytics()
    await getSearchAnalyticsInsights(30)

    expect(get).toHaveBeenCalledWith("/api/analytics/search?days=90")
    expect(get).toHaveBeenCalledWith("/api/analytics/search/insights?days=30")
    expect(get.mock.calls.every((call) => !String(call[0]).startsWith("http"))).toBe(true)
  })
})
