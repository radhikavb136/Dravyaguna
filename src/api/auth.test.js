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

  it("logout clears the API token and stored session keys", async () => {
    vi.stubEnv("VITE_USE_API", "true")
    localStorage.setItem("auth_token", "test-token")
    localStorage.setItem("user", JSON.stringify({ id: "user-1" }))
    localStorage.setItem("isAuthenticated", "true")
    localStorage.setItem("herbUser", JSON.stringify({ id: "legacy" }))
    vi.resetModules()
    const { logout, isAuthenticated } = await import("./auth.js")

    logout()

    expect(localStorage.getItem("auth_token")).toBeNull()
    expect(localStorage.getItem("user")).toBeNull()
    expect(localStorage.getItem("isAuthenticated")).toBeNull()
    expect(localStorage.getItem("herbUser")).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it("mergeAccountIntoStoredUser authoritatively removes profile photo when null", async () => {
    localStorage.setItem("user", JSON.stringify({
      id: "u-1",
      email: "doc@test.com",
      fullName: "Doctor",
      profilePhoto: "data:image/png;base64,existingOldPhoto",
    }))
    localStorage.setItem("herbUser", JSON.stringify({
      id: "u-1",
      profilePhoto: "data:image/png;base64,existingOldPhoto",
      preferences: { profile_photo_data_url: "data:image/png;base64,existingOldPhoto" },
    }))

    const { mergeAccountIntoStoredUser, getCurrentUser } = await import("./auth.js")

    // Account with photo deleted on server: preferences.profile_photo_data_url is null
    const merged = mergeAccountIntoStoredUser({
      id: "u-1",
      email: "doc@test.com",
      full_name: "Doctor",
      preferences: { profile_photo_data_url: null },
    })

    expect(merged.profilePhoto).toBe("")
    expect(getCurrentUser().profilePhoto).toBe("")

    const updatedHerbUser = JSON.parse(localStorage.getItem("herbUser"))
    expect(updatedHerbUser.profilePhoto).toBe("")
  })
})
