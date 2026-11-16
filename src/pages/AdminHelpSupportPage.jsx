import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { submitSupportRequest } from "../api/support"
import { USE_API } from "../api/client"
import { localizeApiError } from "../i18n/localizeApiError"

import "../styles/AdminHelpSupportPage.css"
import { buildAdminHelpFaqs, buildAdminHelpTopics } from "../i18n/helpTopics"
import { useUiText } from "../i18n/useUiText"

function AdminHelpSupportPage() {
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
    navigate("/admin")
  }

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  /* =========================================
     ADMIN HELP CONTENT
     ========================================= */

  const helpTopics = buildAdminHelpTopics(t)

  /* =========================================
     ADMIN FAQ
     ========================================= */

  const faqs = buildAdminHelpFaqs(t)

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

    if (!USE_API) {
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
      setSupportError(localizeApiError(err) || t("helpContactSubmitError"))
    } finally {
      setSupportBusy(false)
    }
  }

  /* =========================================
     RENDER
     ========================================= */

  return (
    <div className="help-support-page">
      {!activeHelpTopic && !showContactForm && (
        <div className="help-support-container">
          <div className="help-support-header">
            <h1>{t("adminHelpTitle")}</h1>
            <p>{t("adminHelpDescription")}</p>
          </div>

          {/* Quick Help Topics */}
          <div className="help-topics-grid">
            {helpTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="help-topic-card"
                onClick={() => handleHelpTopic(topic)}
              >
                <span className="help-topic-icon">{topic.icon}</span>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
              </button>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="help-faq-section">
            <h2>{t("helpFaqTitle")}</h2>

            <div className="help-search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder={t("helpSearchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="help-faq-list">
              {filteredFaqs.length === 0 ? (
                <p className="help-no-results">{t("helpNoResults")}</p>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <div key={index} className="help-faq-item">
                    <button
                      type="button"
                      className="help-faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={openFaq === index}
                    >
                      <span>{faq.question}</span>
                      <span className="help-faq-toggle">
                        {openFaq === index ? "−" : "+"}
                      </span>
                    </button>
                    {openFaq === index && (
                      <div className="help-faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="help-contact-section">
            <h2>{t("helpContactTitle")}</h2>
            <p>{t("helpContactDescription")}</p>
            <button
              type="button"
              className="help-contact-button"
              onClick={handleOpenContact}
            >
              {t("helpContactButton")}
            </button>
          </div>
        </div>
      )}

      {/* Active Help Topic Detail */}
      {activeHelpTopic && (
        <div className="help-topic-detail">
          <button
            type="button"
            className="help-back-button"
            onClick={handleBackToHelp}
          >
            ← {t("helpBackToTopics")}
          </button>

          <div className="help-topic-detail-header">
            <span className="help-topic-detail-icon">
              {activeHelpTopic.icon}
            </span>
            <h2>{activeHelpTopic.title}</h2>
          </div>

          <div className="help-topic-detail-content">
            {activeHelpTopic.content.map((section, index) => (
              <div key={index} className="help-topic-section">
                <h3>{section.heading}</h3>
                <p>{section.text}</p>
                {section.steps && (
                  <ol className="help-topic-steps">
                    {section.steps.map((step, stepIndex) => (
                      <li key={stepIndex}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Form */}
      {showContactForm && (
        <div className="help-contact-form-container">
          <button
            type="button"
            className="help-back-button"
            onClick={handleBackToHelp}
          >
            ← {t("helpBackToTopics")}
          </button>

          {supportSubmitted ? (
            <div className="help-contact-success">
              <span className="help-success-icon">✓</span>
              <h2>{t("helpContactSuccessTitle")}</h2>
              <p>{t("helpContactSuccessMessage")}</p>
              <button
                type="button"
                className="help-contact-button"
                onClick={handleBackToHelp}
              >
                {t("helpContactReturnButton")}
              </button>
            </div>
          ) : (
            <div className="help-contact-form">
              <h2>{t("helpContactFormTitle")}</h2>
              <p>{t("helpContactFormDescription")}</p>

              <form onSubmit={handleSubmitSupport}>
                <div className="help-form-field">
                  <label htmlFor="support-topic">{t("helpContactTopicLabel")}</label>
                  <select
                    id="support-topic"
                    value={supportTopic}
                    onChange={(e) => setSupportTopic(e.target.value)}
                    required
                    disabled={supportBusy}
                  >
                    <option value="">{t("helpContactSelectTopic")}</option>
                    <option value="account">{t("helpContactTopicAccount")}</option>
                    <option value="herb">{t("helpContactTopicHerb")}</option>
                    <option value="vocabulary">{t("helpContactTopicVocabulary")}</option>
                    <option value="user">{t("helpContactTopicUser")}</option>
                    <option value="technical">{t("helpContactTopicTechnical")}</option>
                    <option value="other">{t("helpContactTopicOther")}</option>
                  </select>
                </div>

                <div className="help-form-field">
                  <label htmlFor="support-message">{t("helpContactMessageLabel")}</label>
                  <textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    required
                    rows={6}
                    disabled={supportBusy}
                    placeholder={t("helpContactMessagePlaceholder")}
                  />
                </div>

                {supportError && (
                  <div className="help-contact-error" role="alert">
                    {supportError}
                  </div>
                )}

                <button
                  type="submit"
                  className="help-contact-button"
                  disabled={supportBusy}
                >
                  {supportBusy ? t("pleaseWait") : t("helpContactSubmitButton")}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminHelpSupportPage
