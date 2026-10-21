import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import AdminPageGuard from "../components/AdminPageGuard"
import { canArchiveHerbs, canVerifyHerbs, getBackendRole, ROLE_PERMISSION_MATRIX } from "./roles"

afterEach(cleanup)

describe("frontend role normalization and herb permissions", () => {
  it.each([
    [{ role: "Admin" }, "admin"],
    [{ role: "Ayurvedic Reviewer" }, "domain_expert"],
    [{ role: "Doctor" }, "clinician"],
    [{ role: "User" }, "clinician"],
    [{ role: "Editor" }, "editor"],
    [{ role: "Clinician", backendRole: "domain_expert" }, "domain_expert"],
    ["DOMAIN_EXPERT", "domain_expert"],
  ])("normalizes %j to %s", (input, expected) => {
    expect(getBackendRole(input)).toBe(expected)
  })

  it("allows only admins and domain experts to verify, and only admins to archive", () => {
    expect(canVerifyHerbs({ role: "Admin" })).toBe(true)
    expect(canVerifyHerbs({ role: "Ayurvedic Reviewer" })).toBe(true)
    expect(canVerifyHerbs({ role: "Doctor" })).toBe(false)
    expect(canVerifyHerbs({ role: "Editor" })).toBe(false)
    expect(canArchiveHerbs({ role: "Admin" })).toBe(true)
    expect(canArchiveHerbs({ role: "Ayurvedic Reviewer" })).toBe(false)
    expect(canArchiveHerbs({ role: "Doctor" })).toBe(false)
  })

  it("matches the permissions displayed for admin, reviewer, editor, and regular user", () => {
    expect(ROLE_PERMISSION_MATRIX.Admin["Manage users"]).toBe(true)
    expect(ROLE_PERMISSION_MATRIX["Ayurvedic Reviewer"]["Verify herbs"]).toBe(true)
    expect(ROLE_PERMISSION_MATRIX["Ayurvedic Reviewer"]["Change scoring weights"]).toBe(true)
    expect(ROLE_PERMISSION_MATRIX["Ayurvedic Reviewer"]["View audit log"]).toBe(false)
    expect(ROLE_PERMISSION_MATRIX.Editor["Add vocabulary terms"]).toBe(true)
    expect(ROLE_PERMISSION_MATRIX.Editor["Edit/merge/delete vocabulary"]).toBe(false)
    expect(ROLE_PERMISSION_MATRIX.Doctor["Add herbs"]).toBe(false)
  })

  it("grants admin page access by the canonical role and rejects regular users", () => {
    localStorage.setItem("user", JSON.stringify({ role: "Ayurvedic Reviewer" }))
    const { unmount } = render(<AdminPageGuard allowedRoles={["domain_expert"]}><p>Analytics</p></AdminPageGuard>)
    expect(screen.getByText("Analytics")).toBeTruthy()
    unmount()

    localStorage.setItem("user", JSON.stringify({ role: "Doctor" }))
    render(<AdminPageGuard allowedRoles={["admin"]}><p>User administration</p></AdminPageGuard>)
    expect(screen.getByRole("alert").textContent).toContain("Access denied")
    expect(screen.queryByText("User administration")).toBeNull()
  })

  it("fails closed when the stored user session is malformed", () => {
    localStorage.setItem("user", "{")
    render(<AdminPageGuard allowedRoles={["admin"]}><p>Audit data</p></AdminPageGuard>)
    expect(screen.getByRole("alert").textContent).toContain("Access denied")
    expect(localStorage.getItem("user")).toBeNull()
  })
})
