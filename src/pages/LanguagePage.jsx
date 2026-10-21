import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccount, updateAccountPreferences } from "../api/account"
import { setInterfaceLanguage } from "../i18n/useUiText"

import DashboardNavbar from "../components/DashboardNavbar"
import Sidebar from "../components/Sidebar"

import "../styles/SettingsPage.css"
import "../styles/LanguagePage.css"

function LanguagePage() {
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
      setSelectedLanguage(({ "en-IN": "English", "hi-IN": "Hindi", "mr-IN": "Marathi", "sa-IN": "Sanskrit" })[language] || "English")
      setInterfaceLanguage(language)
    }).catch((err) => setError(err.message || "Unable to load language preference")).finally(() => setLoading(false))
  }, [useApi])

  const handleLanguageChange = async (language) => {
    setError("")
    setMessage("")
    setSelectedLanguage(language)
    if (!useApi) {
      localStorage.setItem("language", language)
      setInterfaceLanguage(({ English: "en-IN", Hindi: "hi-IN", Marathi: "mr-IN", Sanskrit: "sa-IN" })[language])
      return
    }
    try {
      const code = ({ English: "en-IN", Hindi: "hi-IN", Marathi: "mr-IN", Sanskrit: "sa-IN" })[language]
      await updateAccountPreferences({ language: code })
      setInterfaceLanguage(code)
      setMessage("Language preference saved.")
    } catch (err) {
      setError(err.message || "Unable to save language preference")
      try {
        const { preferred_language: previous } = await getAccount()
        setSelectedLanguage(({ "en-IN": "English", "hi-IN": "Hindi", "mr-IN": "Marathi", "sa-IN": "Sanskrit" })[previous] || "English")
        setInterfaceLanguage(previous)
      } catch { /* preserve the selected value while the load error is visible */ }
    }
  }

  const closeLanguage = () => {
    navigate("/doctor")
  }

  if (loading) return <p role="status">Loading language preference...</p>

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

              {/* Close button */}
              <button
                type="button"
                className="settings-close-button"
                onClick={closeLanguage}
                aria-label="Close language"
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
                    PREFERENCES
                  </p>

                  <h1>
                    Language
                  </h1>

                  <p className="language-description">
                    Choose the language you prefer for the application.
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
