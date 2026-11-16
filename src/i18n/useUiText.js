import { useCallback, useEffect, useState } from "react"
import { getAccount } from "../api/account"
import { USE_API } from "../api/client"
import { interpolate } from "./relativeTime.js"
import { uiMessages } from "./messages"

let preferredLanguageRequest

export function setInterfaceLanguage(language) {
  if (!uiMessages[language]) return
  localStorage.setItem("dravyaguna-language", language)
  preferredLanguageRequest = Promise.resolve(language)
  window.dispatchEvent(new Event("dravyaguna-language-change"))
}

function loadInterfaceLanguage() {
  if (!USE_API) return Promise.resolve(localStorage.getItem("dravyaguna-language") || "en-IN")
  if (!preferredLanguageRequest) {
    preferredLanguageRequest = getAccount()
      .then(({ preferred_language: language }) => uiMessages[language] ? language : "en-IN")
      .catch(() => "en-IN")
      .then((language) => {
        localStorage.setItem("dravyaguna-language", language)
        return language
      })
  }
  return preferredLanguageRequest
}

export function useCurrentLanguage() {
  const [language, setLanguage] = useState(() => localStorage.getItem("dravyaguna-language") || "en-IN")

  useEffect(() => {
    let active = true
    const refresh = () => loadInterfaceLanguage().then((value) => { if (active) setLanguage(value) })
    refresh()
    window.addEventListener("dravyaguna-language-change", refresh)
    return () => {
      active = false
      window.removeEventListener("dravyaguna-language-change", refresh)
    }
  }, [])

  return language
}

export function useUiText() {
  const language = useCurrentLanguage()

  return useCallback((key, vars) => {
    const text = translate(language, key)
    return vars ? interpolate(text, vars) : text
  }, [language])
}

export function translate(language, key) {
  return uiMessages[language]?.[key] || uiMessages["en-IN"][key] || key
}
