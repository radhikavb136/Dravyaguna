import { useUiText } from "../i18n/useUiText"

function DashboardWelcome() {
  const t = useUiText()
  return (
    <section className="dashboard-welcome">
      <div className="welcome-content">
        <h2>{t("doctorWelcomeTitle")}</h2>
        <p className="welcome-description">{t("doctorWelcomeDesc")}</p>
      </div>
    </section>
  )
}

export default DashboardWelcome
