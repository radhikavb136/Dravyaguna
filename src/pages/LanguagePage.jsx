import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccount, updateAccountPreferences } from "../api/account"
import { CODE_TO_SELECT_LABEL, SELECT_LABEL_TO_CODE } from "../i18n/languageCodes"
import { setInterfaceLanguage, useUiText } from "../i18n/useUiText"

import DashboardNavbar from "../components/DashboardNavbar"
import PageBack from "../components/PageBack"
import Sidebar from "../components/Sidebar"

import "../styles/SettingsPage.css"
import "../styles/LanguagePage.css"

function LanguagePage() {
  const t = useUiText()
  const navigate = useNavigate()
  const useApi = import.meta.env.VITE_USE_API === "true"

  const [selectedLanguage, setSelectedLanguage] = useState(
    useApi ? "English" : localStorage.getItem("language") || "English"
  )
  const [loading, setLoading] = useState(useApi)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!useApi) return
    getAccount().then(({ preferred_language: language }) => {
      setSelectedLanguage(CODE_TO_SELECT_LABEL[language] || "English")
      setInterfaceLanguage(language)
    }).catch((err) => setError(err.message || t("languagePageLoadError"))).finally(() => setLoading(false))
  }, [useApi])

  const handleLanguageChange = async (language) => {
    setError("")
    setMessage("")
    setSelectedLanguage(language)
    if (!useApi) {
      localStorage.setItem("language", language)
      setInterfaceLanguage(SELECT_LABEL_TO_CODE[language])
      return
    }
    try {
      const code = SELECT_LABEL_TO_CODE[language]
      await updateAccountPreferences({ language: code })
      setInterfaceLanguage(code)
      setMessage(t("languagePageSaved"))
    } catch (err) {
      setError(err.message || t("languagePageSaveError"))
      try {
        const { preferred_language: previous } = await getAccount()
        setSelectedLanguage(CODE_TO_SELECT_LABEL[previous] || "English")
        setInterfaceLanguage(previous)
      } catch { /* preserve the selected value while the load error is visible */ }
    }
  }

  const closeLanguage = () => {
    navigate("/doctor")
  }

  if (loading) return <p role="status">{t("languagePageLoading")}</p>

  return (
    <div className="settings-page-layout">

      {/* Top Navbar */}
      <DashboardNavbar />

      <div className="settings-page-body">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="settings-page-content">

          {/* Same overlay used by Settings */}
          <div className="settings-overlay">

            {/* Language Modal */}
            <div className="language-modal">
              <PageBack fallback="/doctor" />

              {/* Close button */}
              <button
                type="button"
                className="settings-close-button"
                onClick={closeLanguage}
                aria-label={t("languageCloseAria")}
              >
                ×
              </button>


              {/* Language Content */}
              <div className="language-modal-content">

                {error && <p role="alert">{error}</p>}
                {message && <p role="status">{message}</p>}

                {/* Header */}
                <div className="language-header">

                  <p className="language-label">
                    {t("settingsTitle")}
                  </p>

                  <h1>
                    {t("languagePageTitle")}
                  </h1>

                  <p className="language-description">
                    {t("languagePageSubtitle")}
                  </p>

                </div>


                {/* Language Options */}
                <div className="language-options">

                  {/* English */}
                  <button
                    type="button"
                    className={`language-option ${
                      selectedLanguage === "English"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleLanguageChange("English")
                    }
                  >

                    <div>
                      <h2>English</h2>
                      <p>English</p>
                    </div>

                    <span className="language-radio">
                      {selectedLanguage === "English" && "✓"}
                    </span>

                  </button>


                  {/* Hindi */}
                  <button
                    type="button"
                    className={`language-option ${
                      selectedLanguage === "Hindi"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleLanguageChange("Hindi")
                    }
                  >

                    <div>
                      <h2>हिन्दी</h2>
                      <p>Hindi</p>
                    </div>

                    <span className="language-radio">
                      {selectedLanguage === "Hindi" && "✓"}
                    </span>

                  </button>


                  {/* Marathi */}
                  <button
                    type="button"
                    className={`language-option ${
                      selectedLanguage === "Marathi"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleLanguageChange("Marathi")
                    }
                  >

                    <div>
                      <h2>मराठी</h2>
                      <p>Marathi</p>
                    </div>

                    <span className="language-radio">
                      {selectedLanguage === "Marathi" && "✓"}
                    </span>

                  </button>

                  <button
                    type="button"
                    className={`language-option ${
                      selectedLanguage === "Sanskrit" ? "selected" : ""
                    }`}
                    onClick={() => handleLanguageChange("Sanskrit")}
                  >
                    <div>
                      <h2>संस्कृतम्</h2>
                      <p>Sanskrit</p>
                    </div>
                    <span className="language-radio">
                      {selectedLanguage === "Sanskrit" && "✓"}
                    </span>
                  </button>

                </div>

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default LanguagePage
