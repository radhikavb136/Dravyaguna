const ROLE_ALIASES = new Map([
  ["admin", "admin"],
  ["editor", "editor"],
  ["clinician", "clinician"],
  ["user", "clinician"],
  ["doctor", "clinician"],
  ["domain_expert", "domain_expert"],
  ["reviewer", "domain_expert"],
  ["ayurvedic reviewer", "domain_expert"],
])

export const ROLE_PERMISSION_MATRIX = {
  Admin: {
    "Search herbs": true, "View herb details": true, "Add herbs": true,
    "Edit herbs": true, "Review herbs": true, "Verify herbs": true,
    "Add vocabulary terms": true, "Edit/merge/delete vocabulary": true,
    "Change scoring weights": true,
    "View analytics": true, "Manage users": true, "View audit log": true,
  },
  "Ayurvedic Reviewer": {
    "Search herbs": true, "View herb details": true, "Add herbs": true,
    "Edit herbs": true, "Review herbs": true, "Verify herbs": true,
    "Add vocabulary terms": true, "Edit/merge/delete vocabulary": false,
    "Change scoring weights": true,
    "View analytics": true, "Manage users": false, "View audit log": false,
  },
  Editor: {
    "Search herbs": true, "View herb details": true, "Add herbs": true,
    "Edit herbs": true, "Review herbs": true, "Verify herbs": false,
    "Add vocabulary terms": true, "Edit/merge/delete vocabulary": false,
    "Change scoring weights": false,
    "View analytics": false, "Manage users": false, "View audit log": false,
  },
  Doctor: {
    "Search herbs": true, "View herb details": true, "Add herbs": false,
    "Edit herbs": false, "Review herbs": false, "Verify herbs": false,
    "Add vocabulary terms": false, "Edit/merge/delete vocabulary": false,
    "Change scoring weights": false,
    "View analytics": false, "Manage users": false, "View audit log": false,
  },
}

export function getBackendRole(userOrRole) {
  const role = typeof userOrRole === "object" && userOrRole !== null
    ? userOrRole.backendRole || userOrRole.role
    : userOrRole
  return ROLE_ALIASES.get(String(role || "").trim().toLowerCase()) || ""
}

export function canVerifyHerbs(userOrRole) {
  const role = getBackendRole(userOrRole)
  return role === "admin" || role === "domain_expert"
}

export function canArchiveHerbs(userOrRole) {
  return getBackendRole(userOrRole) === "admin"
}
