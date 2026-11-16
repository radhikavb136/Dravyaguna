import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    USE_API: true,
  }
})
vi.mock("../components/DashboardNavbar", () => ({ default: () => <div data-testid="navbar" /> }))
vi.mock("../components/Sidebar", () => ({ default: () => <div data-testid="sidebar" /> }))
vi.mock("../api/herbs", () => ({
  getHerbById: vi.fn(),
}))
vi.mock("../api/favorites", () => ({
  getFavorites: vi.fn().mockResolvedValue({ data: [] }),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))
vi.mock("../api/account", () => ({
  getAccount: vi.fn().mockResolvedValue({ preferred_language: "en-IN" }),
}))

import HerbDetailPage from "./HerbDetailPage"
import { getHerbById } from "../api/herbs"

describe("HerbDetailPage loading and lifecycle states", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "true")
    vi.clearAllMocks()
  })

  it("1. shows loading status instead of not-found while the herb profile is loading", async () => {
    getHerbById.mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={["/herb/test-herb-id"]}>
        <Routes>
          <Route path="/herb/:id" element={<HerbDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByRole("heading", { name: /herb not found/i })).toBeNull()
    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("2. shows herb not found when the API confirms that the herb does not exist", async () => {
    getHerbById.mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={["/herb/missing-herb-id"]}>
        <Routes>
          <Route path="/herb/:id" element={<HerbDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /herb not found/i })).toBeTruthy()
    })
  })

  it("3. shows error state when the API request fails", async () => {
    getHerbById.mockRejectedValue(new Error("Database connection timed out"))

    render(
      <MemoryRouter initialEntries={["/herb/error-herb-id"]}>
        <Routes>
          <Route path="/herb/:id" element={<HerbDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /unable to load herb profile/i })).toBeTruthy()
      expect(screen.getByRole("alert").textContent).toContain("Database connection timed out")
    })
  })

  it("4. shows correct herb details when data is available", async () => {
    getHerbById.mockResolvedValue({
      id: "valid-herb-id",
      englishName: "Guduchi",
      botanicalName: "Tinospora cordifolia",
      sanskritName: "Guduchi",
      regionalNames: ["Giloy"],
      rasa: ["Tikta", "Kashaya"],
      guna: ["Laghu"],
      virya: "Ushna",
      vipaka: "Madhura",
      prabhava: "Rasayana",
      karma: ["Deepana"],
      indications: ["Jvara"],
    })

    render(
      <MemoryRouter initialEntries={["/herb/valid-herb-id"]}>
        <Routes>
          <Route path="/herb/:id" element={<HerbDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText("Tinospora cordifolia").length).toBeGreaterThan(0)
      expect(screen.getByText("Giloy")).toBeTruthy()
    })
  })
})
