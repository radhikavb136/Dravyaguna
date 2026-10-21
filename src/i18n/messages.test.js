import { describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { uiMessages } from "./messages"
import { setInterfaceLanguage, useUiText } from "./useUiText"

describe("interface language", () => {
  it.each(["en-IN", "hi-IN", "mr-IN", "sa-IN"])("has shared navigation labels for %s", (language) => {
    expect(uiMessages[language].home).toBeTruthy()
    expect(uiMessages[language].search).toBeTruthy()
    expect(uiMessages[language].logout).toBeTruthy()
    expect(uiMessages[language].patientConcern).toBeTruthy()
    expect(uiMessages[language].simpleSearch).toBeTruthy()
  })

  it("persists a supported language and notifies mounted navigation", () => {
    const listener = vi.fn()
    window.addEventListener("dravyaguna-language-change", listener)
    setInterfaceLanguage("hi-IN")
    expect(localStorage.getItem("dravyaguna-language")).toBe("hi-IN")
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener("dravyaguna-language-change", listener)
  })

  it("updates mounted navigation when the selected interface language changes", async () => {
    setInterfaceLanguage("en-IN")
    const { result } = renderHook(() => useUiText())
    await waitFor(() => expect(result.current("home")).toBe("Home"))
    act(() => setInterfaceLanguage("hi-IN"))
    await waitFor(() => expect(result.current("home")).toBe("मुखपृष्ठ"))
  })
})
