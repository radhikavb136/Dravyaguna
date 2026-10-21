import { beforeEach, describe, expect, it, vi } from "vitest"

describe("account API persistence contract", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("VITE_USE_API", "true")
    localStorage.clear()
    globalThis.fetch = vi.fn()
  })

  it("loads the signed-in account from the backend", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "user-1", full_name: "Ayurveda User" } }),
    })

    const { getAccount } = await import("./account.js")
    await expect(getAccount()).resolves.toEqual({ id: "user-1", full_name: "Ayurveda User" })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/account",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("persists preferences and returns server validation errors", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { language: "en", result_page_size: 50 } }),
    }).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Unsupported result page size" }),
    })

    const { updateAccountPreferences } = await import("./account.js")
    const preferences = { language: "en", resultPageSize: 50 }
    await expect(updateAccountPreferences(preferences)).resolves.toEqual({ language: "en", result_page_size: 50 })
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/api/account/preferences",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(preferences) })
    )
    await expect(updateAccountPreferences({ resultPageSize: 999 })).rejects.toThrow("Unsupported result page size")
  })
})
