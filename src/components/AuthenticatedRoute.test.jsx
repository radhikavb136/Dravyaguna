import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import AuthenticatedRoute from "./AuthenticatedRoute"

function renderProtectedPage() {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/private" element={<AuthenticatedRoute><p>Private herb data</p></AuthenticatedRoute>} />
        <Route path="/auth" element={<p>Sign in</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("authenticated frontend route", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv("VITE_USE_API", "true")
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it("redirects API users without a session token to sign in", () => {
    renderProtectedPage()
    expect(screen.getByText("Sign in")).toBeTruthy()
    expect(screen.queryByText("Private herb data")).toBeNull()
  })

  it("allows a user with an API session token", () => {
    localStorage.setItem("auth_token", "local-test-token")
    renderProtectedPage()
    expect(screen.getByText("Private herb data")).toBeTruthy()
  })

  it("preserves the explicit local demo session", () => {
    vi.stubEnv("VITE_USE_API", "false")
    localStorage.setItem("isAuthenticated", "true")
    renderProtectedPage()
    expect(screen.getByText("Private herb data")).toBeTruthy()
  })
})
