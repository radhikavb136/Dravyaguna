import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { setInterfaceLanguage } from "../i18n/useUiText"
import SettingsPage from "./SettingsPage"

vi.mock("../components/DashboardNavbar", () => ({ default: () => null }))
vi.mock("../components/Sidebar", () => ({ default: () => null }))

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "false")
    setInterfaceLanguage("hi-IN")
  })

  it("renders localized account panel title", async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/खाता/)
    })
  })
})
