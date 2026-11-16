import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { setInterfaceLanguage } from "../i18n/useUiText"
import AdminSupportRequestsPage from "./AdminSupportRequestsPage"

vi.mock("../api/support", () => ({
  listSupportRequests: vi.fn().mockResolvedValue({
    data: [{
      id: "req-1",
      topic: "search",
      message: "Need help with filters",
      status: "open",
      created_at: new Date().toISOString(),
      user_email: "doctor@test.com",
      user_full_name: "Test Doctor",
    }],
    pagination: { total: 1, limit: 20, offset: 0, totalPages: 1 },
  }),
  updateSupportRequestStatus: vi.fn(),
}))

describe("AdminSupportRequestsPage", () => {
  beforeEach(() => {
    setInterfaceLanguage("en-IN")
  })

  it("renders support requests from the API", async () => {
    render(<AdminSupportRequestsPage />)
    await waitFor(() => {
      expect(screen.getByText(/Support requests/i)).toBeTruthy()
      expect(screen.getByText("doctor@test.com")).toBeTruthy()
      expect(screen.getByText(/Need help with filters/)).toBeTruthy()
    })
  })
})
