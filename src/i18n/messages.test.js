import { describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { uiMessages, UI_LANGUAGE_CODES } from "./messages"
import { translate, setInterfaceLanguage, useUiText } from "./useUiText"

describe("interface language", () => {
  const baseKeys = Object.keys(uiMessages["en-IN"]).sort()

  it.each(UI_LANGUAGE_CODES)("has identical translation keys for %s", (language) => {
    expect(Object.keys(uiMessages[language]).sort()).toEqual(baseKeys)
  })

  it.each(UI_LANGUAGE_CODES)("has shared navigation labels for %s", (language) => {
    expect(uiMessages[language].home).toBeTruthy()
    expect(uiMessages[language].search).toBeTruthy()
    expect(uiMessages[language].logout).toBeTruthy()
    expect(uiMessages[language].patientConcern).toBeTruthy()
    expect(uiMessages[language].simpleSearch).toBeTruthy()
    expect(uiMessages[language].synonymReviewTitle).toBeTruthy()
    expect(uiMessages[language].synonymReviewApprove).toBeTruthy()
    expect(uiMessages[language].authLogIn).toBeTruthy()
    expect(uiMessages[language].passwordResetTitle).toBeTruthy()
    expect(uiMessages[language].passwordResetDescription).toBeTruthy()
    expect(uiMessages[language].passwordResetEmailRequired).toBeTruthy()
    expect(uiMessages[language].passwordResetWeak).toBeTruthy()
    expect(uiMessages[language].passwordResetStrong).toBeTruthy()
  })

  it("falls back to English for unknown keys", () => {
    expect(translate("hi-IN", "zz_missing_key_xyz")).toBe("zz_missing_key_xyz")
    expect(translate("hi-IN", "home")).toBe(uiMessages["hi-IN"].home)
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

  it("exposes Hindi password reset strings", () => {
    expect(uiMessages["hi-IN"].passwordResetTitle).toMatch(/पासवर्ड/)
    expect(uiMessages["hi-IN"].passwordResetDescription).toBeTruthy()
    expect(uiMessages["hi-IN"].passwordResetWeak).toBeTruthy()
    expect(uiMessages["sa-IN"].authLogIn).toBeTruthy()
  })
})
