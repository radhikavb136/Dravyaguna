import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { isAuthenticated, getCurrentUser } from "../api/auth"
import { loadRememberedLogin } from "../utils/rememberedLogin"
import { useUiText } from "../i18n/useUiText"

function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const rem = loadRememberedLogin()
      if (rem.remember && isAuthenticated()) {
        const user = getCurrentUser()
        const role = (user?.backendRole || user?.role || "").toLowerCase()
        if (role === "clinician" || role === "doctor") {
          navigate("/doctor", { replace: true })
          return
        }
        if (["admin", "editor", "domain_expert", "ayurvedic reviewer"].includes(role)) {
          navigate("/admin", { replace: true })
          return
        }
      }
    } catch { /* ignore */ }
  }, [navigate])
  const t = useUiText()

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-icon">🌿</div>
          <span>{t("landingBrand")}</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#about">{t("landingNavAbout")}</a>
          <a href="#features">{t("landingNavFeatures")}</a>
          <a href="#contact">{t("landingNavContact")}</a>
        </nav>

        <div className="landing-auth-buttons">
          <Link to="/auth" className="login-button">
            {t("landingLogIn")}
          </Link>
          <Link to="/auth" className="signup-button">
            {t("landingSignUp")}
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-badge">
            <span>●</span>
            {t("landingHeroBadge")}
          </div>

          <h1>
            {t("landingHeroTitle1")}
            <br />
            <em>{t("landingHeroTitle2")}</em>
          </h1>

          <p className="landing-hero-description">
            {t("landingHeroDescription")}
          </p>

          <div className="hero-buttons">
            <Link to="/auth?mode=signup" className="primary-hero-button">
              {t("landingGetStarted")}
            </Link>
            <a href="#about" className="secondary-hero-button">
              {t("landingExplore")}
            </a>
          </div>
        </section>

        <section className="landing-about" id="about">
          <div className="about-section-label">{t("landingAboutLabel")}</div>

          <div className="about-section-content">
            <div className="about-section-heading">
              <h2>
                {t("landingAboutTitle1")}
                <br />
                <em>{t("landingAboutTitle2")}</em>
              </h2>
            </div>

            <div className="about-section-text">
              <p>{t("landingAboutP1")}</p>
              <p>{t("landingAboutP2")}</p>
              <p>{t("landingAboutP3")}</p>
            </div>
          </div>

          <div className="about-highlights">
            <div className="about-highlight-card">
              <span className="highlight-number">01</span>
              <div>
                <h3>{t("landingHi1Title")}</h3>
                <p>{t("landingHi1Desc")}</p>
              </div>
            </div>

            <div className="about-highlight-card">
              <span className="highlight-number">02</span>
              <div>
                <h3>{t("landingHi2Title")}</h3>
                <p>{t("landingHi2Desc")}</p>
              </div>
            </div>

            <div className="about-highlight-card">
              <span className="highlight-number">03</span>
              <div>
                <h3>{t("landingHi3Title")}</h3>
                <p>{t("landingHi3Desc")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="features-header">
            <div className="features-label">{t("landingFeaturesLabel")}</div>
            <h2>{t("landingFeaturesTitle")}</h2>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-number">01</div>
              <div className="feature-icon">⌕</div>
              <h3>{t("landingFeat1Title")}</h3>
              <p>{t("landingFeat1Desc")}</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">02</div>
              <div className="feature-icon">%</div>
              <h3>{t("landingFeat2Title")}</h3>
              <p>{t("landingFeat2Desc")}</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">03</div>
              <div className="feature-icon">◈</div>
              <h3>{t("landingFeat3Title")}</h3>
              <p>{t("landingFeat3Desc")}</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">04</div>
              <div className="feature-icon">✓</div>
              <h3>{t("landingFeat4Title")}</h3>
              <p>{t("landingFeat4Desc")}</p>
            </div>
          </div>
        </section>

        <section className="landing-stats">
          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-number">350+</span>
              <span className="stat-label">{t("landingStatHerbs")}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10+</span>
              <span className="stat-label">{t("landingStatParams")}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">Multi</span>
              <span className="stat-label">{t("landingStatMulti")}</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">{t("landingStatRank")}</span>
            </div>
          </div>
        </section>

        <section className="landing-contact" id="contact">
          <div className="contact-content">
            <div className="contact-label">{t("landingContactLabel")}</div>
            <p className="contact-text">
              {t("landingContactText")}{" "}
              <a href="mailto:support@herbintelligence.app">
                support@herbintelligence.app
              </a>
            </p>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-brand-icon">🌿</div>
              <span>{t("landingFooterBrand")}</span>
            </div>

            <nav className="footer-links">
              <a href="#about">{t("landingNavAbout")}</a>
              <a href="#features">{t("landingNavFeatures")}</a>
              <a href="#contact">{t("landingNavContact")}</a>
              <a href="#privacy">{t("landingFooterPrivacy")}</a>
              <a href="#terms">{t("landingFooterTerms")}</a>
            </nav>

            <div className="footer-info">
              <span>{t("landingFooterVersion")}</span>
              <span>{t("landingFooterCopyright")}</span>
            </div>
          </div>

          <div className="footer-disclaimer">{t("landingDisclaimer")}</div>
        </footer>
      </main>
    </div>
  )
}

export default LandingPage
