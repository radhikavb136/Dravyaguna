import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

vi.mock("../components/DashboardNavbar", () => ({ default: () => <div data-testid="navbar" /> }))
vi.mock("../components/Sidebar", () => ({ default: () => <div data-testid="sidebar" /> }))
vi.mock("../api/herbs", () => ({
  getHerbById: vi.fn(() => new Promise(() => {})),
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

describe("HerbDetailPage loading", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "true")
  })

  it("shows loading status instead of not-found while the herb profile is loading", async () => {
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
})
