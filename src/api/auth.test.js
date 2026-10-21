import { afterEach, describe, expect, it, vi } from "vitest"

describe("API login session", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
    vi.resetModules()
  })

  it("keeps the backend full name in the authenticated browser session", async () => {
    vi.stubEnv("VITE_USE_API", "true")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "test-token",
        user: { id: "user-1", email: "doctor@example.test", fullName: "Test Doctor", role: "clinician" },
      }),
    }))
    vi.resetModules()
    const { login } = await import("./auth.js")

    const session = await login("doctor@example.test", "password")

    expect(session.user.fullName).toBe("Test Doctor")
    expect(localStorage.getItem("auth_token")).toBe("test-token")
  })
})
