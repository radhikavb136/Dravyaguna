import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { setInterfaceLanguage } from "../i18n/useUiText"
import PasswordResetPage from "./PasswordResetPage"

describe("PasswordResetPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "false")
    setInterfaceLanguage("hi-IN")
  })

  it("renders localized heading for request flow", async () => {
    render(<MemoryRouter><PasswordResetPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole("heading").textContent).toMatch(/पासवर्ड/)
    })
  })
})
