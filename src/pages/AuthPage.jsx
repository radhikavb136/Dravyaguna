import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { login as apiLogin, register as apiRegister, setCurrentUser } from "../api/auth"
import { USE_API } from "../api/client"
import {
  clearRememberedLogin,
  loadRememberedLogin,
  persistRememberedLogin,
} from "../utils/rememberedLogin"
import "../styles/AuthPage.css"

function AuthPage() {
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
      return "Admin"
    }

    if (
      normalizedRole === "doctor"
    ) {
      return "Doctor"
    }

    if (
      normalizedRole === "ayurvedic reviewer" ||
      normalizedRole === "reviewer"
    ) {
      return "Ayurvedic Reviewer"
    }

    return role
  }

  // =========================================
  // LOAD REMEMBERED LOGIN
  // =========================================

  useEffect(() => {
    const savedLogin = loadRememberedLogin()
    if (savedLogin.email) {
      setEmail(savedLogin.email)
      setRememberMe(true)
    }
    if (savedLogin.role) {
      setSelectedRole(savedLogin.role.toLowerCase())
    }
  }, [])

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
      alert(
        "Please fill in all required fields."
      )

      return
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.")

      return
    }

    if (password.length < 10) {
      alert(
        "Password must contain at least 10 characters."
      )

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
          "Account created successfully! You can now log in."
        )

        setEmail(cleanEmail)
        setPassword(password)
        setConfirmPassword("")
        setIsLogin(true)
        setRememberMe(true)
      } catch (error) {
        alert(error.message || "Registration failed. Please try again.")
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
    })

    alert(
      "Account created successfully! You can now log in."
    )

    setEmail(cleanEmail)
    setPassword(password)
    setConfirmPassword("")
    setIsLogin(true)
    setRememberMe(true)
    alert(
      "Account created successfully! You can now log in."
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
      alert("Please enter your email and password.")
      return
    }

    // Use API if feature flag is enabled
    if (USE_API) {
      try {
        const displayRole = getDisplayRole(selectedRole)
        const response = await apiLogin(cleanEmail, password, displayRole)
        
        setCurrentUser(response.user)
        localStorage.setItem("isAuthenticated", "true")

        if (rememberMe) {
          persistRememberedLogin({
            email: cleanEmail,
            role: selectedRole,
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
          alert("This role does not have a configured destination.")
        }
      } catch (error) {
        alert(error.message || "Login failed. Please check your credentials.")
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
      alert("Incorrect password. Please try again.")
      return
    }

    const status = (user.status || "Active").trim().toLowerCase()

    if (status === "inactive" || status === "blocked") {
      alert("This account is blocked. Please contact the admin.")
      return
    }

    if (status === "pending") {
      alert("This account is pending approval. Please contact the admin.")
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
      })
    } else {
      clearRememberedLogin()
    }

    if (selectedNormalizedRole === "doctor") {
      navigate("/doctor")
    } else if (selectedNormalizedRole === "admin") {
      navigate("/admin")
    } else {
      alert("This role does not have a configured destination.")
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
            ⌁
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
            Log In
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
            Sign Up
          </button>

        </div>


        {/* ROLE */}

        <div className="auth-section">

          <label className="auth-label">
            ROLE
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
                Doctor
              </span>
            </button>


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
                Admin
              </span>
            </button>

          </div>

        </div>


        {/* SIGN UP OPTIONS */}

        {!isLogin && (
          <>

            {/* LANGUAGE */}

            <div className="auth-field">

              <label htmlFor="language">
                Language
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
              Email
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
              Password
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
                    ? "Hide password"
                    : "Show password"
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
                Confirm Password
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
                      ? "Hide confirm password"
                      : "Show confirm password"
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
                  Remember me on this device
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
              ? "Log In"
              : "Create Account"}
          </button>

          {isLogin && <Link to="/password-reset">Forgot password?</Link>}

        </form>


        {/* BOTTOM SWITCH */}

        <div className="auth-switch">

          {isLogin ? (
            <>
              <span>
                Don't have an account?
              </span>

              <button
                type="button"
                onClick={
                  switchToSignUp
                }
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <span>
                Already have an account?
              </span>

              <button
                type="button"
                onClick={
                  switchToLogin
                }
              >
                Log In
              </button>
            </>
          )}

        </div>

      </div>


      {/* DISCLAIMER */}

      <p className="auth-disclaimer">

        For qualified Ayurvedic physicians and licensed
        <br />
        healthcare professionals only.

      </p>

    </div>
  )
}

export default AuthPage
