import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { setInterfaceLanguage } from "../i18n/useUiText"
import LandingPage from "./LandingPage"

describe("LandingPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "false")
    setInterfaceLanguage("hi-IN")
  })

  it("renders localized hero title", async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/आयुर्वेदिक/)
    })
  })
})
