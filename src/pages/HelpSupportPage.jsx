import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { submitSupportRequest } from "../api/support"
import { USE_API } from "../api/client"
import { localizeApiError } from "../i18n/localizeApiError"

import DashboardNavbar from "../components/DashboardNavbar"
import PageBack from "../components/PageBack"
import Sidebar from "../components/Sidebar"

import "../styles/SettingsPage.css"
import "../styles/HelpSupportPage.css"
import { buildHelpFaqs, buildHelpTopics } from "../i18n/helpTopics"
import { useUiText } from "../i18n/useUiText"

function HelpSupportPage() {
  const useApi = typeof import.meta.env.VITE_USE_API !== "undefined"
    ? import.meta.env.VITE_USE_API === "true"
    : Boolean(USE_API)
  const t = useUiText()
  const navigate = useNavigate()

  const [openFaq, setOpenFaq] = useState(null)
  const [searchText, setSearchText] = useState("")

  const [activeHelpTopic, setActiveHelpTopic] = useState(null)
  const [showContactForm, setShowContactForm] = useState(false)

  const [supportTopic, setSupportTopic] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  const [supportSubmitted, setSupportSubmitted] = useState(false)
  const [supportBusy, setSupportBusy] = useState(false)
  const [supportError, setSupportError] = useState("")

  const closeHelp = () => {
    navigate("/doctor")
  }

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  /* =========================================
     QUICK HELP CONTENT
  ========================================= */

  const helpTopics = buildHelpTopics(t)

  /* =========================================
     FAQ
  ========================================= */

  const faqs = buildHelpFaqs(t)

  const filteredFaqs = faqs.filter((faq) => {
    const search = searchText.toLowerCase().trim()

    return (
      faq.question.toLowerCase().includes(search) ||
      faq.answer.toLowerCase().includes(search)
    )
  })

  /* =========================================
     QUICK HELP HANDLER
  ========================================= */

  const handleHelpTopic = (topic) => {
    setActiveHelpTopic(topic)
    setShowContactForm(false)
    setSearchText("")
  }

  const handleBackToHelp = () => {
    setActiveHelpTopic(null)
    setShowContactForm(false)
    setSupportSubmitted(false)
  }

  /* =========================================
     CONTACT SUPPORT
  ========================================= */

  const handleOpenContact = () => {
    setShowContactForm(true)
    setActiveHelpTopic(null)
    setSupportSubmitted(false)
  }

  const handleSubmitSupport = async (event) => {
    event.preventDefault()
    setSupportError("")

    if (!useApi) {
      setSupportError(t("helpContactApiRequired"))
      return
    }

    setSupportBusy(true)
    try {
      await submitSupportRequest({
        topic: supportTopic,
        message: supportMessage.trim(),
      })
      setSupportSubmitted(true)
      setSupportTopic("")
      setSupportMessage("")
    } catch (err) {
      setSupportError(localizeApiError(t, err.message) || t("helpContactSubmitError"))
    } finally {
      setSupportBusy(false)
    }
  }

  return (
    <div className="settings-page-layout">

      {/* TOP NAVBAR */}
      <DashboardNavbar />

      <div className="settings-page-body">

        {/* SIDEBAR */}
        <Sidebar />

        <main className="settings-page-content">

          <div className="settings-overlay">

            <div className="help-support-modal">
              <PageBack fallback="/doctor" />

              {/* CLOSE */}
              <button
                type="button"
                className="settings-close-button"
                onClick={closeHelp}
                aria-label={t("helpCloseAria")}
              >
                ×
              </button>


              {/* =========================================
                  QUICK HELP DETAIL
              ========================================= */}

              {activeHelpTopic ? (

                <div className="help-detail-view">

                  <button
                    type="button"
                    className="help-back-button"
                    onClick={handleBackToHelp}
                  >
                    ← {t("helpBackToHelp")}
                  </button>

                  <div className="help-detail-header">

                    <div className="help-detail-icon">
                      {helpTopics[activeHelpTopic].icon}
                    </div>

                    <div>

                      <p className="help-label">
                        HELP GUIDE
                      </p>

                      <h1>
                        {helpTopics[activeHelpTopic].title}
                      </h1>

                      <p>
                        {helpTopics[activeHelpTopic].description}
                      </p>

                    </div>

                  </div>


                  <div className="help-detail-content">

                    {helpTopics[activeHelpTopic].sections.map(
                      (section) => (
                        <div
                          className="help-detail-section"
                          key={section.title}
                        >

                          <h2>
                            {section.title}
                          </h2>

                          <p>
                            {section.text}
                          </p>

                        </div>
                      )
                    )}

                  </div>


                  <div className="help-detail-footer">

                    <p>
                      Need more help with this topic?
                    </p>

                    <button
                      type="button"
                      className="help-contact-button"
                      onClick={handleOpenContact}
                    >
                      {t("helpContactSupport")}
                      <span>→</span>
                    </button>

                  </div>

                </div>

              ) : showContactForm ? (

                /* =========================================
                   CONTACT SUPPORT VIEW
                ========================================= */

                <div className="help-contact-view">

                  <button
                    type="button"
                    className="help-back-button"
                    onClick={handleBackToHelp}
                  >
                    ← {t("helpBackToHelp")}
                  </button>


                  {!supportSubmitted ? (

                    <>
                      <div className="help-contact-header">

                        <div className="help-detail-icon">
                          💬
                        </div>

                        <div>

                          <p className="help-label">
                            {t("helpSupportLabel")}
                          </p>

                          <h1>
                            {t("helpContactTitle")}
                          </h1>

                          <p>
                            {t("helpContactIntro")}
                          </p>

                        </div>

                      </div>


                      {supportError && (
                        <p className="help-form-error" role="alert">
                          {supportError}
                        </p>
                      )}

                      <form
                        className="help-contact-form"
                        onSubmit={handleSubmitSupport}
                      >

                        <div className="help-form-group">

                          <label htmlFor="support-topic">
                            {t("helpContactTopicLabel")}
                          </label>

                          <select
                            id="support-topic"
                            value={supportTopic}
                            onChange={(event) =>
                              setSupportTopic(event.target.value)
                            }
                            required
                          >

                            <option value="">
                              {t("helpContactTopicPlaceholder")}
                            </option>

                            <option value="search">
                              {t("helpContactTopicSearch")}
                            </option>

                            <option value="herb">
                              {t("helpContactTopicHerb")}
                            </option>

                            <option value="account">
                              {t("helpContactTopicAccount")}
                            </option>

                            <option value="billing">
                              {t("helpContactTopicBilling")}
                            </option>

                            <option value="technical">
                              {t("helpContactTopicTechnical")}
                            </option>

                            <option value="other">
                              {t("helpContactTopicOther")}
                            </option>

                          </select>

                        </div>


                        <div className="help-form-group">

                          <label htmlFor="support-message">
                            {t("helpContactMessageLabel")}
                          </label>

                          <textarea
                            id="support-message"
                            rows="5"
                            placeholder={t("helpContactMessagePlaceholder")}
                            value={supportMessage}
                            onChange={(event) =>
                              setSupportMessage(event.target.value)
                            }
                            required
                          />

                        </div>


                        <button
                          type="submit"
                          className="help-submit-button"
                          disabled={supportBusy}
                        >
                          {supportBusy ? t("helpContactSubmitting") : t("helpContactSubmit")}
                          <span>→</span>
                        </button>

                      </form>

                    </>

                  ) : (

                    <div className="help-success-message">

                      <div className="help-success-icon">
                        ✓
                      </div>

                      <h2>
                        {t("helpContactSuccessTitle")}
                      </h2>

                      <p>
                        {t("helpContactSuccessBody")}
                      </p>

                      <p className="help-success-note">
                        {t("helpContactSuccessNote")}
                      </p>

                      <button
                        type="button"
                        className="help-back-home-button"
                        onClick={handleBackToHelp}
                      >
                        {t("helpBackToHelp")}
                      </button>

                    </div>

                  )}

                </div>

              ) : (

                /* =========================================
                   MAIN HELP PAGE
                ========================================= */

                <>

                  {/* HEADER */}

                  <div className="help-header">

                    <p className="help-label">
                      {t("helpCenterLabel")}
                    </p>

                    <h1>
                      How can we help?
                    </h1>

                    <p>
                      Find answers, learn how to use Herb Intelligence,
                      or get support.
                    </p>

                  </div>


                  {/* SEARCH */}

                  <div className="help-search">

                    <span className="help-search-icon">
                      🔍
                    </span>

                    <input
                      type="text"
                      placeholder={t("helpSearchPlaceholder")}
                      value={searchText}
                      onChange={(event) =>
                        setSearchText(event.target.value)
                      }
                    />

                    {searchText && (

                      <button
                        type="button"
                        className="help-search-clear"
                        onClick={() => setSearchText("")}
                        aria-label={t("helpClearSearchAria")}
                      >
                        ×
                      </button>

                    )}

                  </div>


                  {/* QUICK HELP */}

                  {!searchText && (

                    <section className="help-section">

                      <div className="help-section-heading">

                        <h2>
                          Quick help
                        </h2>

                        <p>
                          Get familiar with the main features
                          of the platform.
                        </p>

                      </div>


                      <div className="help-quick-grid">

                        <button
                          type="button"
                          className="help-quick-card"
                          onClick={() =>
                            handleHelpTopic("search")
                          }
                        >

                          <div className="help-card-icon">
                            🔎
                          </div>

                          <div>

                            <h3>
                              Search Guide
                            </h3>

                            <p>
                              Learn how Simple and Detailed
                              Search work.
                            </p>

                          </div>

                          <span className="help-card-arrow">
                            →
                          </span>

                        </button>


                        <button
                          type="button"
                          className="help-quick-card"
                          onClick={() =>
                            handleHelpTopic("herbs")
                          }
                        >

                          <div className="help-card-icon">
                            🌿
                          </div>

                          <div>

                            <h3>
                              Herb Profiles
                            </h3>

                            <p>
                              Understand herb properties
                              and Ayurvedic attributes.
                            </p>

                          </div>

                          <span className="help-card-arrow">
                            →
                          </span>

                        </button>


                        <button
                          type="button"
                          className="help-quick-card"
                          onClick={() =>
                            handleHelpTopic("results")
                          }
                        >

                          <div className="help-card-icon">
                            📊
                          </div>

                          <div>

                            <h3>
                              Understanding Results
                            </h3>

                            <p>
                              Learn about ranking, matching
                              and comparisons.
                            </p>

                          </div>

                          <span className="help-card-arrow">
                            →
                          </span>

                        </button>


                        <button
                          type="button"
                          className="help-quick-card"
                          onClick={() =>
                            handleHelpTopic("billing")
                          }
                        >

                          <div className="help-card-icon">
                            💳
                          </div>

                          <div>

                            <h3>
                              Plans & Billing
                            </h3>

                            <p>
                              Learn about Free, Pro and Max plans.
                            </p>

                          </div>

                          <span className="help-card-arrow">
                            →
                          </span>

                        </button>

                      </div>

                    </section>

                  )}


                  {/* FAQ */}

                  <section className="help-section faq-section">

                    <div className="help-section-heading">

                      <h2>
                        Frequently Asked Questions
                      </h2>

                      <p>
                        Find quick answers to common questions.
                      </p>

                    </div>


                    <div className="faq-list">

                      {filteredFaqs.length > 0 ? (

                        filteredFaqs.map((faq, index) => (

                          <div
                            className={`faq-item ${
                              openFaq === index
                                ? "open"
                                : ""
                            }`}
                            key={faq.question}
                          >

                            <button
                              type="button"
                              className="faq-question"
                              onClick={() =>
                                toggleFaq(index)
                              }
                            >

                              <span>
                                {faq.question}
                              </span>

                              <span className="faq-arrow">
                                {openFaq === index
                                  ? "−"
                                  : "+"}
                              </span>

                            </button>


                            {openFaq === index && (

                              <div className="faq-answer">

                                <p>
                                  {faq.answer}
                                </p>

                              </div>

                            )}

                          </div>

                        ))

                      ) : (

                        <div className="help-no-results">

                          <span>
                            🔍
                          </span>

                          <h3>
                            No help articles found
                          </h3>

                          <p>
                            Try searching with a different keyword.
                          </p>

                        </div>

                      )}

                    </div>

                  </section>


                  {/* CONTACT SUPPORT */}

                  <section className="help-support-card">

                    <div className="help-support-content">

                      <div className="help-support-icon">
                        💬
                      </div>

                      <div>

                        <h2>
                          Still need help?
                        </h2>

                        <p>
                          Our support team can help you with
                          questions about searching, herb
                          information, accounts and plans.
                        </p>

                      </div>

                    </div>


                    <button
                      type="button"
                      className="help-contact-button"
                      onClick={handleOpenContact}
                    >
                      {t("helpContactSupport")}
                      <span>→</span>
                    </button>

                  </section>


                  {/* FOOTER */}

                  <div className="help-footer">

                    <span>
                      Herb Intelligence
                    </span>

                    <span>
                      •
                    </span>

                    <span>
                      {t("helpTitle")}
                    </span>

                  </div>

                </>

              )}

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default HelpSupportPage