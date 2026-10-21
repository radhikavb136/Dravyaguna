import { getCurrentUser } from "../api/auth"
import { getBackendRole } from "../utils/roles"

export default function AdminPageGuard({ allowedRoles, children }) {
  const role = getBackendRole(getCurrentUser())
  if (!allowedRoles.includes(role)) {
    return (
      <section role="alert" aria-live="polite">
        <h1>Access denied</h1>
        <p>Your account does not have permission to view this administration page.</p>
      </section>
    )
  }
  return children
}
