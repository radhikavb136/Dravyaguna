import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login as apiLogin, register as apiRegister, setCurrentUser, mergeAccountIntoStoredUser, isAuthenticated, getCurrentUser } from "../api/auth"
import { getAccount } from "../api/account"
import { USE_API } from "../api/client"
import {
  clearRememberedLogin,
  loadRememberedLogin,
  persistRememberedLogin,
} from "../utils/rememberedLogin"
import "../styles/AuthPage.css"
import { useUiText } from "../i18n/useUiText"

function AuthPage() {
  const t = useUiText()
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(false)
  const [selectedRole, setSelectedRole] = useState("doctor")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // =========================================
  // SIGN UP FIELDS
  // =========================================

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [language, setLanguage] = useState("English")
  const [profession, setProfession] =
    useState("Ayurvedic Physician")

  // =========================================
  // LOGIN
  // =========================================

  const [rememberMe, setRememberMe] = useState(false)

  // =========================================
  // ROLE NORMALIZATION
  // =========================================

  const getDisplayRole = (role) => {
    if (!role) {
      return ""
    }

    const normalizedRole = role.toLowerCase().trim()

    if (normalizedRole === "admin") {
      return t("authRoleAdmin")
    }

    if (
      normalizedRole === "doctor"
    ) {
      return t("authRoleDoctor")
    }

    if (
      normalizedRole === "ayurvedic reviewer" ||
      normalizedRole === "reviewer"
    ) {
      return t("authAyurvedicReviewer")
    }

    return role
  }

  // =========================================
  // LOAD REMEMBERED LOGIN
  // =========================================

  useEffect(() => {
    const savedLogin = loadRememberedLogin()
    if (savedLogin.remember && isAuthenticated()) {
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
    if (savedLogin.email) {
      setEmail(savedLogin.email)
      setRememberMe(savedLogin.remember !== false)
    }
    if (savedLogin.role) {
      setSelectedRole(savedLogin.role.toLowerCase())
    }
  }, [navigate])

  // =========================================
  // ROLE CHANGE
  // =========================================

  const handleRoleChange = (role) => {
    setSelectedRole(role)

    if (isLogin) {
      setEmail("")
      setPassword("")
      setRememberMe(false)
    }

    if (role === "admin") {
      setProfession("Ayurvedic Physician")
    }
  }

  // =========================================
  // GET DRAVYAGUNA USERS
  // =========================================

  const getDravyagunaUsers = () => {
    const savedUsers =
      localStorage.getItem("dravyaguna_users")

    if (!savedUsers) {
      return []
    }

    try {
      const users = JSON.parse(savedUsers)

      if (!Array.isArray(users)) {
        return []
      }

      return users
    } catch {
      return []
    }
  }

  // =========================================
  // GET HERB USERS
  // =========================================

  const getHerbUsers = () => {
    const savedUsers =
      localStorage.getItem("herbUsers")

    if (!savedUsers) {
      return []
    }

    try {
      const users = JSON.parse(savedUsers)

      if (!Array.isArray(users)) {
        return []
      }

      return users
    } catch {
      return []
    }
  }

  // =========================================
  // SIGN UP
  // =========================================

  const handleSignUp = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      alert(t("authFillRequired"))

      return
    }

    if (password !== confirmPassword) {
      alert(t("authPasswordMismatch"))

      return
    }

    if (password.length < 10) {
      alert(t("authPasswordMinLength"))

      return
    }

    const cleanEmail =
      email.trim().toLowerCase()

    // Use API if feature flag is enabled
    if (USE_API) {
      try {
        const displayRole = getDisplayRole(selectedRole)
        await apiRegister(cleanEmail, password, fullName.trim(), displayRole)
        
        alert(
          t("authAccountCreated")
        )

        setEmail(cleanEmail)
        setPassword(password)
        setConfirmPassword("")
        setIsLogin(true)
        setRememberMe(true)
      } catch (error) {
        alert(error.message || t("authRegistrationFailed"))
      }
      return
    }

    // Fallback to localStorage-based registration (existing code)
    const dravyagunaUsers =
      getDravyagunaUsers()

    const existingDravyagunaUser =
      dravyagunaUsers.find(
        (user) =>
          user.email?.toLowerCase() ===
          cleanEmail
      )

    if (existingDravyagunaUser) {
      alert(
        "An account with this email already exists. Please log in."
      )

      setEmail(cleanEmail)
      setPassword("")
      setConfirmPassword("")
      setIsLogin(true)

      return
    }

    const herbUsers =
      getHerbUsers()

    const existingHerbUser =
      herbUsers.find(
        (user) =>
          user.email?.toLowerCase() ===
          cleanEmail
      )

    if (existingHerbUser) {
      alert(
        "An account with this email already exists. Please log in."
      )

      setEmail(cleanEmail)
      setPassword("")
      setConfirmPassword("")
      setIsLogin(true)

      return
    }

    const roleForManagement =
      getDisplayRole(selectedRole)

    const initials =
      fullName
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const now =
      new Date().toISOString()

    const newManagementUser = {
      id:
        "USR-" +
        Date.now(),

      name:
        fullName.trim(),

      fullName:
        fullName.trim(),

      initials:
        initials,

      email:
        cleanEmail,

      password:
        password,

      role:
        roleForManagement,

      status:
        "Active",

      language:
        language,

      profession:
        selectedRole === "doctor"
          ? profession
          : null,

      lastActive:
        now,

      createdAt:
        now,
    }

    const updatedDravyagunaUsers = [
      ...dravyagunaUsers,
      newManagementUser,
    ]

    localStorage.setItem(
      "dravyaguna_users",
      JSON.stringify(
        updatedDravyagunaUsers
      )
    )

    const newHerbUser = {
      fullName:
        fullName.trim(),

      email:
        cleanEmail,

      password:
        password,

      role:
        selectedRole,

      language:
        language,

      profession:
        selectedRole === "doctor"
          ? profession
          : null,
    }

    const updatedHerbUsers = [
      ...herbUsers,
      newHerbUser,
    ]

    localStorage.setItem(
      "herbUsers",
      JSON.stringify(
        updatedHerbUsers
      )
    )

    localStorage.setItem(
      "herbUser",
      JSON.stringify(
        newManagementUser
      )
    )

    persistRememberedLogin({
            email: cleanEmail,
            role: selectedRole,
            remember: true,
          })

    alert(
      t("authAccountCreated")
    )

    setEmail(cleanEmail)
    setPassword(password)
    setConfirmPassword("")
    setIsLogin(true)
    setRememberMe(true)
    alert(
      t("authAccountCreated")
    )

    setEmail(cleanEmail)
    setPassword(password)
    setConfirmPassword("")
    setIsLogin(true)
    setRememberMe(true)
  }

  // =========================================
  // LOGIN
  // =========================================

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      alert(t("authEnterEmailPassword"))
      return
    }

    // Use API if feature flag is enabled
    if (USE_API) {
      try {
        const displayRole = getDisplayRole(selectedRole)
        const response = await apiLogin(cleanEmail, password, displayRole)
        
        setCurrentUser(response.user)
        localStorage.setItem("isAuthenticated", "true")
        try {
          const account = await getAccount()
          mergeAccountIntoStoredUser(account)
        } catch {
          /* profile photo hydrates on next dashboard load */
        }

        if (rememberMe) {
          persistRememberedLogin({
            email: cleanEmail,
            role: selectedRole,
            remember: true,
          })
        } else {
          clearRememberedLogin()
        }

        // Navigate based on role
        const backendRole = response.user.backendRole
        if (backendRole === 'clinician') {
          navigate("/doctor")
        } else if (backendRole === 'admin' || backendRole === 'editor' || backendRole === 'domain_expert') {
          navigate("/admin")
        } else {
          alert(t("authNoRoleDestination"))
        }
      } catch (error) {
        alert(error.message || t("authLoginFailed"))
      }
      return
    }

    // Feature flag disabled - use localStorage only
    // NOTE: This path should only be used when VITE_USE_API=false
    const dravyagunaUsers = getDravyagunaUsers()
    const herbUsers = getHerbUsers()

    const normalizeRole = (role) => {
      const value = (role || "").trim().toLowerCase()

      if (value === "doctor") return "doctor"
      if (value === "admin") return "admin"
      if (value === "ayurvedic reviewer" || value === "reviewer") {
        return "reviewer"
      }

      return value
    }

    const selectedNormalizedRole = normalizeRole(selectedRole)

    let user = dravyagunaUsers.find((account) => {
      const accountEmail = (account.email || "").trim().toLowerCase()
      const accountRole = normalizeRole(account.role)

      return (
        accountEmail === cleanEmail &&
        accountRole === selectedNormalizedRole
      )
    })

    if (!user) {
      user = herbUsers.find((account) => {
        const accountEmail = (account.email || "").trim().toLowerCase()
        const accountRole = normalizeRole(account.role)

        return (
          accountEmail === cleanEmail &&
          accountRole === selectedNormalizedRole
        )
      })
    }

    if (!user) {
      alert(
        `No ${getDisplayRole(selectedRole)} account found with this email. Please check your selected role or sign up first.`
      )
      return
    }

    if (user.password !== password) {
      alert(t("authIncorrectPassword"))
      return
    }

    const status = (user.status || "Active").trim().toLowerCase()

    if (status === "inactive" || status === "blocked") {
      alert(t("authAccountBlocked"))
      return
    }

    if (status === "pending") {
      alert(t("authAccountPending"))
      return
    }

    const now = new Date().toISOString()

    const updatedUsers = dravyagunaUsers.map((account) => {
      const matchesEmail =
        (account.email || "").trim().toLowerCase() === cleanEmail

      const matchesRole =
        normalizeRole(account.role) === selectedNormalizedRole

      return matchesEmail && matchesRole
        ? { ...account, lastActive: now }
        : account
    })

    localStorage.setItem(
      "dravyaguna_users",
      JSON.stringify(updatedUsers)
    )

    const loggedInUser = {
      ...user,
      lastActive: now,
      role: getDisplayRole(user.role || selectedRole),
    }

    localStorage.setItem("herbUser", JSON.stringify(loggedInUser))
    localStorage.setItem("isAuthenticated", "true")

    if (rememberMe) {
      persistRememberedLogin({
            email: cleanEmail,
            role: selectedRole,
            remember: true,
          })
    } else {
      clearRememberedLogin()
    }

    if (selectedNormalizedRole === "doctor") {
      navigate("/doctor")
    } else if (selectedNormalizedRole === "admin") {
      navigate("/admin")
    } else {
      alert(t("authNoRoleDestination"))
    }
  }

  // =========================================
  // SUBMIT
  // =========================================

  const handleSubmit = (event) => {
    event.preventDefault()

    if (isLogin) {
      handleLogin()
    } else {
      handleSignUp()
    }
  }

  // =========================================
  // SWITCH TO LOGIN
  // =========================================

  const switchToLogin = () => {
    setIsLogin(true)

    const savedLogin = loadRememberedLogin()

    if (!savedLogin.email) {
      setEmail("")
      setPassword("")
      setRememberMe(false)
      return
    }

    setEmail(savedLogin.email)
    setPassword("")
    setRememberMe(true)
    if (savedLogin.role) {
      setSelectedRole(savedLogin.role.toLowerCase())
    }
  }

  // =========================================
  // SWITCH TO SIGN UP
  // =========================================

  const switchToSignUp = () => {
    setIsLogin(false)
    if (USE_API) {
      setSelectedRole("doctor")
    }

    setPassword("")
    setConfirmPassword("")
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="auth-page">

      {/* BACK TO HOME */}

      <Link
        to="/"
        className="back-home-button"
      >
        <span>‹</span>
        Back to home
      </Link>


      {/* BRAND */}

      <div className="auth-brand">

        <div className="auth-brand-row">

          <div className="auth-brand-icon">
            🌿
          </div>

          <span>
            Herb Intelligence
          </span>

        </div>

        <p>
          Clinical decision support · Ayurveda
        </p>

      </div>


      {/* AUTH CARD */}

      <div className="auth-card">


        {/* LOGIN / SIGN UP */}

        <div className="auth-tabs">

          <button
            type="button"
            className={`auth-tab ${
              isLogin
                ? "active"
                : ""
            }`}
            onClick={switchToLogin}
          >
            {t("authLogInTab")}
          </button>


          <button
            type="button"
            className={`auth-tab ${
              !isLogin
                ? "active"
                : ""
            }`}
            onClick={switchToSignUp}
          >
            {t("authSignUpTab")}
          </button>

        </div>


        {/* ROLE */}

        <div className="auth-section">

          <label className="auth-label">
            {t("authRoleLabel")}
          </label>

          <div className="role-options">

            <button
              type="button"
              className={`role-option ${
                selectedRole === "doctor"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleRoleChange(
                  "doctor"
                )
              }
            >
              <span className="role-icon">
                ♧
              </span>

              <span>
                {t("authDoctor")}
              </span>
            </button>


            {(isLogin || !USE_API) && (
              <button
                type="button"
                className={`role-option ${
                  selectedRole === "admin"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  handleRoleChange(
                    "admin"
                  )
                }
              >
                <span className="role-icon">
                  ♢
                </span>

                <span>
                  {t("authAdmin")}
                </span>
              </button>
            )}

          </div>

        </div>


        {/* SIGN UP OPTIONS */}

        {!isLogin && (
          <>

            {/* LANGUAGE */}

            <div className="auth-field">

              <label htmlFor="language">
                {t("authLanguage")}
              </label>

              <select
                id="language"
                value={language}
                onChange={(event) =>
                  setLanguage(
                    event.target.value
                  )
                }
              >

                <option value="English">
                  English
                </option>

                <option value="Marathi">
                  Marathi
                </option>

                <option value="Hindi">
                  Hindi
                </option>

              </select>

            </div>


            {/* PROFESSION */}

            {selectedRole ===
              "doctor" && (

              <div className="auth-field">

                <label htmlFor="profession">
                  Profession
                </label>

                <select
                  id="profession"
                  value={profession}
                  onChange={(event) =>
                    setProfession(
                      event.target.value
                    )
                  }
                >

                  <option value="Ayurvedic Physician">
                    Ayurvedic Physician
                  </option>

                  <option value="Ayurvedic Practitioner">
                    Ayurvedic Practitioner
                  </option>

                  <option value="Ayurvedic Researcher">
                    Ayurvedic Researcher
                  </option>

                  <option value="Ayurveda Student">
                    Ayurveda Student
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

            )}

          </>
        )}


        {/* FORM */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >


          {/* FULL NAME */}

          {!isLogin && (

            <div className="auth-field">

              <label htmlFor="fullName">
                Full Name
              </label>

              <input
                type="text"
                id="fullName"
                placeholder={
                  selectedRole === "admin"
                    ? "Admin Name"
                    : "Dr. Ananya Sharma"
                }
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                autoComplete="name"
              />

            </div>

          )}


          {/* EMAIL */}

          <div className="auth-field">

            <label htmlFor="email">
              {t("authEmail")}
            </label>

            <input
              type="email"
              id="email"
              placeholder={
                selectedRole === "admin"
                  ? "admin@gmail.com"
                  : "doctor@example.com"
              }
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="email"
            />

          </div>


          {/* PASSWORD */}

          <div className="auth-field">

            <label htmlFor="password">
              {t("authPassword")}
            </label>

            <div className="password-field">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete={
                  isLogin
                    ? "current-password"
                    : "new-password"
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? t("authHidePassword")
                    : t("authShowPassword")
                }
              >
                {showPassword
                  ? "◉"
                  : "◌"}
              </button>

            </div>

          </div>


          {/* CONFIRM PASSWORD */}

          {!isLogin && (

            <div className="auth-field">

              <label htmlFor="confirmPassword">
                {t("authConfirmPassword")}
              </label>

              <div className="password-field">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? t("authHideConfirmPassword")
                      : t("authShowConfirmPassword")
                  }
                >
                  {showConfirmPassword
                    ? "◉"
                    : "◌"}
                </button>

              </div>

            </div>

          )}


          {/* REMEMBER ME */}

          {isLogin && (

            <div className="remember-login">

              <label className="remember-checkbox">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                />

                <span>
                  {t("authRememberMe")}
                </span>

              </label>

            </div>

          )}


          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit"
          >
            {isLogin
              ? t("authLogIn")
              : t("authCreateAccount")}
          </button>

          {isLogin && <Link to="/password-reset">{t("authForgotPassword")}</Link>}

        </form>


        {/* BOTTOM SWITCH */}

        <div className="auth-switch">

          {isLogin ? (
            <>
              <span>
                {t("authNoAccount")}
              </span>

              <button
                type="button"
                onClick={
                  switchToSignUp
                }
              >
                {t("authSwitchSignUp")}
              </button>
            </>
          ) : (
            <>
              <span>
                {t("authHaveAccount")}
              </span>

              <button
                type="button"
                onClick={
                  switchToLogin
                }
              >
                {t("authSwitchLogIn")}
              </button>
            </>
          )}

        </div>

      </div>


      {/* DISCLAIMER */}

      <p className="auth-disclaimer">
        {t("authDisclaimer")}
      </p>

    </div>
  )
}

export default AuthPage
