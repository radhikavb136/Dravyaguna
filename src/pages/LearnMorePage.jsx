import { useNavigate } from "react-router-dom"

import DashboardNavbar from "../components/DashboardNavbar"
import Sidebar from "../components/Sidebar"
import { useUiText } from "../i18n/useUiText"

import "../styles/LearnMorePage.css"

function LearnMorePage() {
  const t = useUiText()
  const navigate = useNavigate()

  const closeLearnMore = () => {
    navigate("/doctor")
  }

  return (
    <div className="learn-more-page-layout">

      {/* Top Navbar */}
      <DashboardNavbar />

      <div className="learn-more-page-body">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="learn-more-page-content">

          {/* Dark Overlay */}
          <div className="learn-more-overlay">

            {/* Learn More Modal */}
            <div className="learn-more-modal">

              {/* Close Button */}
              <button
                type="button"
                className="learn-more-close-button"
                onClick={closeLearnMore}
                aria-label={t("learnCloseAria")}
              >
                ×
              </button>


              {/* Header */}
              <div className="learn-more-header">

                <p className="learn-more-label">
                  {t("learnLabel")}
                </p>

                <h1>
                  {t("learnTitle")}
                </h1>

                <p>
                  {t("learnSubtitle")}
                </p>

              </div>


              {/* Content */}
              <div className="learn-more-content">


                {/* What is Dravyaguna */}
                <section className="learn-more-section">

                  <h2>
                    {t("learnWhatTitle")}
                  </h2>

                  <p>
                    {t("learnWhatBody")}
                  </p>

                </section>


                {/* How it works */}
                <section className="learn-more-section">

                  <p className="learn-more-section-label">
                    {t("learnHowLabel")}
                  </p>

                  <h2>
                    {t("learnHowTitle")}
                  </h2>


                  <div className="learn-more-steps">

                    <div className="learn-more-step">

                      <div className="learn-more-step-number">
                        01
                      </div>

                      <div>
                        <h3>
                          {t("learnStep1Title")}
                        </h3>

                        <p>
                          {t("learnStep1Body")}
                        </p>
                      </div>

                    </div>


                    <div className="learn-more-step">

                      <div className="learn-more-step-number">
                        02
                      </div>

                      <div>
                        <h3>
                          {t("learnStep2Title")}
                        </h3>

                        <p>
                          {t("learnStep2Body")}
                        </p>
                      </div>

                    </div>


                    <div className="learn-more-step">

                      <div className="learn-more-step-number">
                        03
                      </div>

                      <div>
                        <h3>
                          {t("learnStep3Title")}
                        </h3>

                        <p>
                          {t("learnStep3Body")}
                        </p>
                      </div>

                    </div>


                    <div className="learn-more-step">

                      <div className="learn-more-step-number">
                        04
                      </div>

                      <div>
                        <h3>
                          {t("learnStep4Title")}
                        </h3>

                        <p>
                          {t("learnStep4Body")}
                        </p>
                      </div>

                    </div>

                  </div>

                </section>


                {/* Capabilities */}
                <section className="learn-more-section">

                  <p className="learn-more-section-label">
                    CORE CAPABILITIES
                  </p>

                  <h2>
                    What you can do
                  </h2>


                  <div className="learn-more-capabilities">

                    <div className="learn-more-capability">
                      <strong>
                        Simple Search
                      </strong>

                      <span>
                        Search herbs using a clinical problem or description.
                      </span>
                    </div>


                    <div className="learn-more-capability">
                      <strong>
                        Detailed Search
                      </strong>

                      <span>
                        Filter herbs using structured Ayurvedic parameters.
                      </span>
                    </div>


                    <div className="learn-more-capability">
                      <strong>
                        Relevance Ranking
                      </strong>

                      <span>
                        View herbs ranked according to matching criteria.
                      </span>
                    </div>


                    <div className="learn-more-capability">
                      <strong>
                        Herb Comparison
                      </strong>

                      <span>
                        Compare Ayurvedic characteristics across herbs.
                      </span>
                    </div>

                  </div>

                </section>


                {/* Clinical Note */}
                <section className="learn-more-note">

                  <div className="learn-more-note-icon">
                    !
                  </div>

                  <div>

                    <strong>
                      {t("learnClinicalNoteTitle")}
                    </strong>

                    <p>
                      Dravyaguna is intended to support research and
                      clinical information retrieval. It does not replace
                      professional Ayurvedic judgment or established
                      clinical guidance.
                    </p>

                  </div>

                </section>


              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default LearnMorePage