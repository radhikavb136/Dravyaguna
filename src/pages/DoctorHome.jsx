import DashboardNavbar from "../components/DashboardNavbar"
import "../styles/DoctorHome.css"
import Sidebar from "../components/Sidebar"
import DashboardWelcome from "../components/DashboardWelcome"
import SearchModeCard from "../components/SearchModeCard"
import SavedFavorites from "../components/SavedFavorites"
import SearchInsights from "../components/SearchInsights"
import InfoTooltip from "../components/InfoTooltip"
import { useUiText } from "../i18n/useUiText"

function DoctorHome() {
  const t = useUiText()
  return (
    <div className="doctor-layout">
      <DashboardNavbar />
      <div className="dashboard-body">
        <Sidebar />
        <main className="main-content">
          <DashboardWelcome />
          <section className="search-modes">
            <div className="section-heading">
              <p>{t("doctorSearchHeading")}</p>
              <h2>
                {t("doctorSearchTitle")}
                <InfoTooltip contentKey="simpleSearch" text="Select Simple Search for natural language symptom descriptions, or Detailed Search for Ayurvedic multi-parameter filtering." />
              </h2>
            </div>
            <div className="search-mode-container">
              <SearchModeCard
                icon="✦"
                title={t("doctorSimpleCardTitle")}
                description={t("doctorSimpleCardDesc")}
                mode="simple"
                hoverInfo={t("simpleDescription")}
              />
              <SearchModeCard
                icon="☷"
                title={t("doctorDetailedCardTitle")}
                description={t("doctorDetailedCardDesc")}
                mode="detailed"
                hoverInfo={t("detailedDescription")}
              />
            </div>
          </section>
          <section className="dashboard-insights">
            <SavedFavorites />
            <SearchInsights />
          </section>
        </main>
      </div>
    </div>
  )
}

export default DoctorHome
