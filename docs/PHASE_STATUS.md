# Dravyaguna release status

Updated 2026-10-21. This is the living status file. `PHASE_0_STATUS.md` and `PHASE_1_STATUS.md` are historical.

## Re-verification evidence (2026-10-21)

- `backend`: `$env:DATABASE_URL=<isolated local PostgreSQL>; $env:API_BASE_URL=http://127.0.0.1:4015; $env:NODE_ENV=test; npm.cmd test` → `12 passed, 0 failed, 12 total`.
- Frontend `npm.cmd test -- --run` → `Test Files 5 passed (5); Tests 21 passed (21)`.
- Frontend `npm.cmd run lint` → exit 0, 0 errors, 39 warnings.
- Frontend `npm.cmd run verify:api-build` → `PASS API production bundle excludes 6 mock persistence keys.`
- Backend `npm.cmd test` → `15 passed, 0 failed, 15 total` against the isolated local database.
- B1 backend `npm.cmd test` against the same isolated DB and fresh local API (`API_BASE_URL=http://127.0.0.1:4017`) → `16 passed, 0 failed, 16 total`.
- Backend `npm.cmd run migrate` applied additive migration `012_term_synonyms_approval_status` on the isolated DB; `npm.cmd run check:rls` → `All public tables have row-level security enabled.`
- D backend `npm.cmd test` against the isolated local DB and fresh API → `17 passed, 0 failed, 17 total`; covers mock cache hit, provider failure degradation, reference/scoring payload, herb-edit cache invalidation, auth/validation, and the 10-per-user/minute limit.
- D frontend `npm.cmd test -- --run` → `Test Files 6 passed (6); Tests 24 passed (24)`; ESLint → exit 0, 0 errors, 39 warnings; `npm.cmd run build` succeeded (616.90 kB JS chunk warning) and `npm.cmd run verify:api-build` → `PASS API production bundle excludes 6 mock persistence keys.`
- Backend `npm.cmd run migrate` applied additive migration `013_vocabulary_definition_status`; all vocabulary definition statuses default to `draft` on the isolated DB.
- Translation backend `npm.cmd run migrate` applied additive migration `014_translation_cache_provider` against the isolated DB. Backend `npm.cmd test` against the isolated DB and fresh API at port 45731 → `18 passed, 0 failed, 18 total`; includes three-field mock caching, zero provider calls on repeated reads, API translation output, clinician verification denial, domain-expert verification audit persistence, and edit invalidation.
- Translation frontend `npm.cmd test -- --run` → `Test Files 6 passed (6); Tests 24 passed (24)`; ESLint → exit 0, 0 errors, 39 warnings; `npm.cmd run build` succeeded (618.32 kB JS chunk warning); `npm.cmd run verify:api-build` → `PASS API production bundle excludes 6 mock persistence keys.`
- Translation reviewer-control follow-up frontend `npm.cmd test -- --run` → `Test Files 6 passed (6); Tests 24 passed (24)`; ESLint → exit 0, 0 errors, 39 warnings; `npm.cmd run build` succeeded (621.36 kB JS chunk warning); API bundle check passed. Admin/domain-expert detail controls now call the tested verification API; browser interaction remains unverified.
- E backend `npm.cmd run migrate` applied additive migration `015_password_reset_single_use` to the isolated DB. `npm.cmd test` with local API port 45988 → `20 passed, 0 failed, 20 total`; upload checks reject invalid magic bytes, >2 MB bodies, clinician access, and external test-mode writes; reset checks cover generic responses, hashed tokens, 30-minute expiry, password change, single-use behavior, and rate limiting.
- E frontend `npm.cmd test -- --run` → `Test Files 6 passed (6); Tests 24 passed (24)`; ESLint → exit 0, 0 errors, 39 warnings; `npm.cmd run build` succeeded (620.29 kB JS chunk warning); API bundle check passed.
- B3 CSV backend `npm.cmd test` with local API port 45990 → `21 passed, 0 failed, 21 total`; CSV format, filename, stored rows, and admin-only authorization are asserted. XLSX returns 501 and remains blocked.
- B4 backend `npm.cmd test` with isolated local DB/API port 45992 → `22 passed, 0 failed, 22 total`, including the rank-before-breakdown SQL contract and unchanged search/weight result tests. Local `node scripts/explainSearch.js` baseline: 18.630 ms; optimized query: 13.813 ms (single warm local run, 176 herbs). `npm run measure:search-concurrency` under API pool max 5: 5 clients 201.40 req/s, avg 24.29 ms, p97.5 35 ms; 10 clients 205.60 req/s, avg 48.11 ms, p97.5 63 ms. Pool max 10: 5 clients 193.40 req/s, avg 25.34 ms, p97.5 37 ms; 10 clients 243.20 req/s, avg 40.54 ms, p97.5 57 ms. All runs reported 0 errors and 0 non-2xx.
- Frontend adapter tests: `npm.cmd test -- --run` → `Test Files 5 passed (5); Tests 21 passed (21)`; `npm.cmd run lint` → exit 0, 0 errors, 39 warnings; production build and API-build mock scan passed.
- Backend `npm.cmd run migrate` applied `011_enable_rls_public_tables`; `npm.cmd run check:rls` → `All public tables have row-level security enabled.`
- Migration 005 is already applied and historically recreated `herb_mala`; it must not be rerun. All new schema changes are additive/ALTER-only.
- Local production smoke: Vite preview root and `/herb-library` both returned HTTP 200; production-mode API `/api/health` returned HTTP 200 with API/database `ok`.
- Backend `npm.cmd run migrate`: no migrations pending when explicitly pointed at the isolated local PostgreSQL database at port 54333.
- Backend `npm.cmd test`: 12/12 passed against the isolated database. Herb regression cases prove editors and reviewers cannot archive through the general update endpoint while Admin can. Admin audit tests confirm user creation, role changes, status changes, and name/email edits are recorded. Other cases cover verification, domain expert scoring/analytics, immediate token permission revocation, vocabulary relinking/protected deletion, and the Phase B simple-search threshold of 0.45.
- Chromium with the local API: clinician login, profile, language, and search settings persisted after reload; restored seed values afterward.
- Chromium with the local API: admin dashboard, herb management, vocabulary, scoring, users, audit log, and analytics pages loaded without API errors or browser exceptions.
- Chromium with the local API: admin user name/email edit and scoring weight changes persisted after reload; restored seed user values and scoring weights afterward.
- Chromium with the local API: clinician herb library/detail, favorite add/reload/remove, simple fever search (9 results), and saved-search create/list/run/delete passed. The saved search and favorite rows were cleaned up afterward.
- Chromium with the local API: admin herb draft create, edit hydration, and description/identification-note persistence passed; the temporary test herb was removed.
- Chromium with the local API: admin Karma term create/edit persisted across reloads; temporary vocabulary term was removed. Unsupported API vocabulary fields and local-only activation/deactivation controls are now hidden in server mode; failed create/update/delete/merge requests surface errors.
- Chromium with the local API: admin role change for the seeded clinician persisted after reload; the original role and active status were restored.
- Fixed a stale `SearchResults` memo that kept API search results empty, and preserved backend `matchPercentage` values through the frontend adapter.
- Backend request logging now redacts `Authorization` and `Cookie` headers.
- Frontend role normalization now consistently maps Admin, Ayurvedic Reviewer, Doctor/User, Editor, legacy case variants, and backend role IDs. Admin routes redirect unauthenticated or regular clinician accounts, and admin-only pages render an access-denied state for unauthorized elevated roles. Herb Verify/Archive controls use the normalized role; backend checks remain authoritative.
- Backend authentication now loads the current role and account status from PostgreSQL on every authenticated request. Integration tests prove an existing admin token loses admin access immediately after demotion and an inactive account's existing token is rejected; login is still required to restore a session after reactivation.
- The User & Role Management permissions matrix and sidebar now reflect API capabilities: reviewers can verify herbs, change scoring weights, and view analytics but cannot access user management/audit; editors can add herbs and vocabulary terms but cannot verify herbs, edit/merge/delete vocabulary, or change scoring; clinicians are limited to clinical/search workflows.
- API-backed clinical/search/account routes now redirect users without an API token to sign in. The same boundary honors the explicit `isAuthenticated` session in local demo mode, and logout clears that marker.
- The embedded DB script initialized and started a clean isolated cluster at port 54333. An older local cluster at port 54331 failed with a shared-memory-in-use error; it was left untouched. The script checks for `PG_VERSION` before init so it does not reinitialize existing data.
- Live API `GET /api/health`: returned `{ status: "ok", database: "ok" }` on 2026-10-21.
- `git diff --check`: passed on 2026-10-21; Git emitted only LF-to-CRLF conversion notices.

The repository `.env` still defaults to an unverified Supabase pooler URL. A migration command using that default was denied by the environment before connecting; no remote migration ran. Subsequent migration and API test commands used the explicit local `127.0.0.1:54333` URL. Always override the database URL for local migration/test work until the development project reference is confirmed.

The old Supabase URL in `backend/.env` is a pooler target, and `DEV_DB_REF` is absent. The backend safety guard therefore refuses tests against it. No project reference was guessed, no safety check was weakened, and no remote database was used. Integration results above are from the local embedded database only.

## Recent implementation

- Added repo-root `AGENTS.md` with the standing safety, testing, status, and documentation rules; read `docs/PHASE_STATUS.md`, `KNOWN_ISSUES.md`, `API.md`, and `MANUAL_CHECKLIST.md` after confirming the supplied build prompt override.
- Herb archive authorization is enforced in the service layer for status changes through PUT/PATCH and the dedicated DELETE route. Editors and domain experts cannot set `status: archived` through the general update route; API regression tests cover those denials and the Admin path.
- Admin user creation, role changes, and status changes now write audit records in the same transaction as the mutation; the API suite verifies all user mutation audit events.
- Admin metrics and search analytics read backend aggregates; audit log and user management use protected backend routes.
- Admin profile, preferred language, notification and workspace preferences, and password changes use authenticated account APIs. Admin profile photo upload and active-session reporting remain unavailable and are identified as such in the UI.
- Admin user name/email editing now has a validated admin-only API with transaction and audit record.
- Clinician profile, preferred language, password, and displayed settings are wired to account APIs. Search mode and result page size consume the stored preferences. Email change requires the unavailable verification-mail service.
- Favorites and saved searches have API-backed create/list/delete flows; saved searches can be named and rerun from the saved library.
- Herb library, admin dashboard, and herb management now follow pagination metadata rather than silently stopping at the first 200 herbs.
- Scoring configuration saves as one server transaction with audit logging; invalid parameter groups roll back the request.
- The isolated importer/migration fixes, match rounding correction, and custom vocabulary slug/canonical lookup fix are retained.
- Simple search trigram similarity now uses the Phase B threshold (0.45); synonym quality/coverage still depends on the pending domain-approved seed list.

## Current status table

| Phase | Feature | Status | Evidence / remaining work |
|---|---|---|---|
| A0 | Test foundation and local DB guard | VERIFIED | `backend npm test`: 15 passed, 0 failed; frontend `npm test -- --run`: 21 passed, 0 failed. |
| A | Authentication and role enforcement | VERIFIED | Backend auth/RBAC and frontend role-boundary automated suites passed in those commands. |
| A | Herb library, details, CRUD, verification, archive | WIRED-UNVERIFIED | API suite passes; end-to-end page and role workflows still need automated browser tests. |
| A | Detailed search and scoring | WIRED-UNVERIFIED | API suite passes; detailed search UI workflow and search-after-weight-change UI remain unverified. |
| A | Vocabulary management | WIRED-UNVERIFIED | API suite covers validation, merge/relink, and protected deletion; UI workflows need automated browser coverage. |
| A | User/role management, analytics, audit | WIRED-UNVERIFIED | API suite covers permissions, persistence, and audit events; browser workflows need automated coverage. |
| A | Profile, language, settings | WIRED-UNVERIFIED | Account API tests pass; browser persistence claims are not automated tests. |
| A | Favorites and saved searches | WIRED-UNVERIFIED | API tests pass; browser workflows need automated coverage. |
| A | Compare | WIRED-UNVERIFIED | Selection stores herb IDs locally and reads herb data through APIs; workflow is not automated. |
| B1 | Approved-only Simple Search mapping and UI | WIRED-UNVERIFIED | Backend integration tests cover draft exclusion, an approved `term_synonyms` mapping, unknown phrase zero-results plus async logging, request-only fuzzy matching, unsupported-language notes, and the 0.45 threshold/80% relative cutoff. Draft CSV is not loaded. UI feedback shows matched/unmatched terms; browser workflow remains unverified. |
| B2 | Expert-approved vocabulary import/relink | BLOCKED | `backend/scripts/vocab_review.csv` has 657 rows and zero nonempty `approved_canonical` values; an expert-approved mapping file is required. |
| B3a | Admin CSV export endpoint and script | VERIFIED | Local backend `npm.cmd test`: `21 passed, 0 failed, 21 total`; covers admin-only access, CSV headers/filename, and stored data. `npm run export:herbs` uses `API_BASE_URL` plus `EXPORT_ADMIN_TOKEN`. |
| B3b | XLSX export | BLOCKED | API reports HTTP 501 explicitly; no XLSX writer dependency is available in this environment. |
| B4 | Query/performance work | WIRED-UNVERIFIED | SQL materializes and limits ranked candidates before computing breakdown JSON; backend contract and score tests pass. Local warm EXPLAIN decreased 18.630→13.813 ms. Controlled pool-size measurements are recorded above, but cloud/Supabase throughput and larger production data remain unverified. Existing historical flat-throughput results had no archived metrics; current measurements suggest concurrency queuing (latency roughly doubles at pool 5 / 10 clients) and demonstrate a pool-10 throughput increase at 10 clients, but cannot explain the earlier run conclusively. |
| C | Herb descriptive translation, cache, verification, selector | WIRED-UNVERIFIED | Backend mock/cache/verification API tests pass; detail selector calls `GET /api/herbs/:id?lang=...` and labels machine output. Browser interaction is not verified. Live Sarvam/Google/Azure requests are blocked until keys are supplied; search-query translation and full UI localization remain unimplemented. |
| D1/D2 | Grounded explain API, cache, and InfoIcon | WIRED-UNVERIFIED | Mock-backed service/API and InfoIcon unit tests pass; rate limiting, cache invalidation and structured failure response are tested. Browser interaction is not verified. Real OpenAI calls remain blocked pending `LLM_API_KEY` and `LLM_MODEL`. |
| E1 | Herb image upload | BLOCKED | Endpoint and Add/Edit UI validate JPEG/PNG/WebP by magic bytes and 2 MB cap; tests verify permissions and reject external writes in test mode. Live upload needs Supabase Storage credentials, bucket, and policy. |
| E2 | Password reset | BLOCKED | API/UI and backend tests cover generic requests, hashed single-use tokens, 30-minute expiry, and password change. The email sender is a no-output stub; SMTP delivery is not implemented/configured, so users cannot receive reset links. |
| F | RLS | VERIFIED | Local `npm run check:rls`: all public tables enabled; backend suite verifies no public policies. Supabase project review remains. |
| F | Production configuration and first-admin safety | WIRED-UNVERIFIED | Render/Vercel configs, names-only env examples, and seed guards are present; local API/SPA smoke checks pass, but first-admin creation against staging is not run. |
| G | Staging deployment | BLOCKED | Needs staging Supabase URL, hosting accounts, frontend origin, and deployment secrets. |

## Remaining critical work

1. Obtain expert approval for any starter synonym mappings and add browser coverage for Simple Search feedback; the draft CSV is intentionally not imported.
2. Provide Supabase Storage configuration before enabling image uploads and implement/configure SMTP delivery before enabling password resets.
3. Add XLSX export and B4 query/performance work; B2 remains blocked until the Ayurveda expert approves mappings.
4. Add automated browser coverage where the environment supports it. `agent-browser` is not installed; do not label manual browser claims VERIFIED.
5. Deploy to staging and verify only after a staging Supabase target, hosting accounts, and secrets are supplied. Do not run migrations against the unverified Supabase URL.

## External launch dependencies

Live translation and LLM generation, SMTP password reset/email verification, persistent image storage, billing, production hosting/secrets, and a deployment-time database/RLS policy review require external configuration and remain incomplete. Explain retrieval uses stored SQL records and scoring; no external vector service is currently required. Dockerfiles and context exclusions were updated, but the Docker image was not built because Docker is not installed in this environment.

Labels: `NOT STARTED`, `WIRED-UNVERIFIED`, `VERIFIED`, `BLOCKED`. VERIFIED refers only to the scope and environment stated above.
