import { beforeEach, describe, expect, it, vi } from "vitest"

describe("herb search API adapters", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("VITE_USE_API", "true")
    localStorage.clear()
    globalThis.fetch = vi.fn()
  })

  it("maps simple-search results and sends the backend request shape", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "herb-1",
            english_name: "Guduchi",
            match_percentage: 87,
          },
        ],
        matched_terms: [{ term: "fever", canonical: "Jwara", vocabulary: "indication", similarity: 1, matchType: "approved_synonym" }],
        unmatched_tokens: ["unknown"],
        lang: "en-IN",
      }),
    })

    const { searchHerbsSimple } = await import("./herbs.js")
    const response = await searchHerbsSimple("fever", 25)

    expect(response.results).toEqual([
      expect.objectContaining({
        id: "herb-1",
        englishName: "Guduchi",
        match: 87,
        matchPercentage: 87,
      }),
    ])
    expect(response.matchedTerms[0].canonical).toBe("Jwara")
    expect(response.unmatchedTokens).toEqual(["unknown"])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/search/simple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "fever", limit: 25 }),
      })
    )
  })

  it("forwards the account language and preserves an unavailable-translation message", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
        matched_terms: [],
        unmatched_tokens: ["दीपन"],
        lang: "hi-IN",
        note: "Search translation is not configured. The query was not interpreted.",
      }),
    })

    const { searchHerbsSimple } = await import("./herbs.js")
    const response = await searchHerbsSimple("दीपन", 25, {}, { lang: "hi-IN" })

    expect(response.note).toContain("not configured")
    expect(response.language).toBe("hi-IN")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/search/simple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "दीपन", limit: 25, lang: "hi-IN" }),
      })
    )
  })

  it("preserves camel-case match scores returned by search endpoints", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ id: "herb-2", englishName: "Haritaki", matchPercentage: 62 }],
      }),
    })

    const { searchHerbsSimple } = await import("./herbs.js")
    const { results: [result] } = await searchHerbsSimple("fever")

    expect(result).toEqual(expect.objectContaining({
      englishName: "Haritaki",
      match: 62,
      matchPercentage: 62,
    }))
  })

  it("sends clinical constraints with a simple search even when the text query is empty", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: "herb-3", english_name: "Guduchi" }] }),
    })

    const { searchHerbsSimple } = await import("./herbs.js")
    const { results } = await searchHerbsSimple("", 10, { rasa: ["tikta"] })

    expect(results[0].englishName).toBe("Guduchi")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/search/simple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ limit: 10, filters: { rasa: ["tikta"] } }),
      })
    )
  })

  it("keeps detailed-search results as an adapted array", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ id: "herb-2", englishName: "Haritaki" }],
      }),
    })

    const { searchHerbsDetailed } = await import("./herbs.js")
    const results = await searchHerbsDetailed({ rasa: ["tikta"] })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("herb-2")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/search/detailed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ filters: { rasa: ["tikta"] }, limit: 50 }),
      })
    )
  })
})
