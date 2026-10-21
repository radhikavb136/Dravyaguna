import "./App.css"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import LandingPage from "./pages/LandingPage"
import AuthPage from "./pages/AuthPage"
import PasswordResetPage from "./pages/PasswordResetPage"
import DoctorHome from "./pages/DoctorHome"
import AdminDashboard from "./pages/AdminDashboard"
import SearchPage from "./pages/SearchPage"
import SearchResults from "./pages/SearchResults"
import ComparePage from "./pages/ComparePage"
import HerbLibrary from "./pages/HerbLibrary"
import HerbDetailPage from "./pages/HerbDetailPage"
import FavoritesPage from "./pages/FavoritesPage"
import ProfilePage from "./pages/ProfilePage"
import SettingsPage from "./pages/SettingsPage"
import HelpSupportPage from "./pages/HelpSupportPage"
import LanguagePage from "./pages/LanguagePage"
import UpgradePlanPage from "./pages/UpgradePlanPage"
import PaymentPage from "./pages/PaymentPage"
import LearnMorePage from "./pages/LearnMorePage"
import ManageHerbs from "./pages/ManageHerbs"
import AdminLayout from "./components/AdminLayout"
import AddHerb from "./pages/AddHerb"
import VocabularyManagement from "./pages/VocabularyManagement"
import ScoringConfiguration from "./pages/ScoringConfiguration"
import SearchAnalytics from "./pages/SearchAnalytics"
import UserRoleManagement from "./pages/UserRoleManagement"
import AuditLog from "./pages/AuditLog"
import AdminProfilePage from "./pages/AdminProfilePage"
import AdminSettingsPage from "./pages/AdminSettingsPage"
import AdminLanguagePage from "./pages/AdminLanguagePage"
import AdminUpgradePlanPage from "./pages/AdminUpgradePlanPage"
import AdminPageGuard from "./components/AdminPageGuard"
import AuthenticatedRoute from "./components/AuthenticatedRoute"

const ADMIN_EXPERT = ["admin", "domain_expert"]
const HERB_EDITORS = ["admin", "editor", "domain_expert"]
const ADMIN_ONLY = ["admin"]

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />

        {/* Doctor Dashboard */}
        <Route path="/doctor" element={<AuthenticatedRoute><DoctorHome /></AuthenticatedRoute>} />
       {/* Admin Dashboard */}
       <Route path="/admin" element={<AdminLayout />}>
           <Route index element={<AdminPageGuard allowedRoles={ADMIN_EXPERT}><AdminDashboard /></AdminPageGuard>} />
           <Route path="manage-herbs" element={<AdminPageGuard allowedRoles={HERB_EDITORS}><ManageHerbs /></AdminPageGuard>} />
           <Route path="add-herb" element={<AdminPageGuard allowedRoles={HERB_EDITORS}><AddHerb /></AdminPageGuard>} />
           <Route path="vocabulary" element={<AdminPageGuard allowedRoles={HERB_EDITORS}><VocabularyManagement /></AdminPageGuard>} />
           <Route path="scoring" element={<AdminPageGuard allowedRoles={ADMIN_EXPERT}><ScoringConfiguration /></AdminPageGuard>} />
           <Route path="search-analytics" element={<AdminPageGuard allowedRoles={ADMIN_EXPERT}><SearchAnalytics /></AdminPageGuard>} />
           <Route path="users" element={<AdminPageGuard allowedRoles={ADMIN_ONLY}><UserRoleManagement /></AdminPageGuard>} />
           <Route path="audit-log" element={<AdminPageGuard allowedRoles={ADMIN_ONLY}><AuditLog /></AdminPageGuard>} />
           <Route path="profile" element={<AdminProfilePage />} />
           <Route path="settings" element={<AdminSettingsPage />} />
           <Route path="/admin/language" element={<AdminLanguagePage />}/>
           <Route
    path="/admin/upgrade-plan"
    element={<AdminUpgradePlanPage />}
  />

      </Route>

        {/* Search */}
        <Route path="/search" element={<AuthenticatedRoute><SearchPage /></AuthenticatedRoute>} />
        <Route path="/search-results" element={<AuthenticatedRoute><SearchResults /></AuthenticatedRoute>} />

        {/* Herb Pages */}
        <Route path="/herb-library" element={<AuthenticatedRoute><HerbLibrary /></AuthenticatedRoute>} />
        <Route path="/herb/:id" element={<AuthenticatedRoute><HerbDetailPage /></AuthenticatedRoute>} />

        {/* Doctor Workspace */}
        <Route path="/compare" element={<AuthenticatedRoute><ComparePage /></AuthenticatedRoute>} />
        <Route path="/favorites" element={<AuthenticatedRoute><FavoritesPage /></AuthenticatedRoute>} />

        {/* Profile / Preferences */}
        <Route path="/profile" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />
        <Route path="/settings" element={<AuthenticatedRoute><SettingsPage /></AuthenticatedRoute>} />
        <Route path="/language" element={<AuthenticatedRoute><LanguagePage /></AuthenticatedRoute>} />
        <Route path="/help-support" element={<HelpSupportPage />} />

        {/* Additional Pages */}
        <Route path="/upgrade" element={<UpgradePlanPage />} />
        <Route path="/payment" element={<PaymentPage />}/>
        <Route path="/learn-more" element={<LearnMorePage />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
