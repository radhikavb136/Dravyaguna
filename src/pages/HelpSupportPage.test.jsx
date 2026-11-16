import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { setInterfaceLanguage } from "../i18n/useUiText"
import HelpSupportPage from "./HelpSupportPage"

vi.mock("../components/DashboardNavbar", () => ({ default: () => null }))
vi.mock("../components/Sidebar", () => ({ default: () => null }))
vi.mock("../api/support", () => ({
  submitSupportRequest: vi.fn().mockResolvedValue({ id: "req-1" }),
}))

describe("HelpSupportPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_API", "true")
    setInterfaceLanguage("en-IN")
  })

  it("submits support request through API before showing success", async () => {
    const { submitSupportRequest } = await import("../api/support")
    render(
      <MemoryRouter>
        <HelpSupportPage />
      </MemoryRouter>
    )

    const contactButtons = screen.getAllByRole("button", { name: /contact support/i })
    fireEvent.click(contactButtons[contactButtons.length - 1])
    fireEvent.change(screen.getByLabelText(/What do you need help with/i), {
      target: { value: "search" },
    })
    fireEvent.change(screen.getByLabelText(/Describe your issue/i), {
      target: { value: "Need help finding herbs by rasa filter." },
    })
    fireEvent.click(screen.getByRole("button", { name: /Send support request/i }))

    await waitFor(() => {
      expect(submitSupportRequest).toHaveBeenCalledWith({
        topic: "search",
        message: "Need help finding herbs by rasa filter.",
      })
    })
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/received/i)
    })
  })
})
