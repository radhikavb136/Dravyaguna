import { Navigate } from "react-router-dom"
import { isAuthenticated } from "../api/auth"

export default function AuthenticatedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/auth" replace />
}
