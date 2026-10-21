# Staging/manual click-through checklist

No browser click-through is claimed as verified here. Each row describes the manual check the owner should perform against **staging**, then record the result. API/backend automated evidence is tracked separately in [`PHASE_STATUS.md`](./PHASE_STATUS.md).

## Start the application

Use a verified **local development/test PostgreSQL database only** for local review. Do not copy a Supabase production connection into these commands. The current isolated local database used by automated tests is at port `54334`; it must already be running and migrated. Port `54333` is a stale cluster and must not be used. Set values in the process environment rather than storing them in this document.

**Backend terminal (PowerShell, from the repository root):**

```powershell
Set-Location 'C:\Users\Radhika V Bhosale\Downloads\Dravyaguna (2)\Dravyaguna\Dravyaguna\backend'
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna'
$env:JWT_SECRET = 'local-only-development-secret-change-before-deploy'
$env:FRONTEND_ORIGIN = 'http://localhost:5173'
$env:PORT = '4000'
$env:NODE_ENV = 'development'
npm.cmd start
```

**Frontend terminal (PowerShell, from the repository root):**

```powershell
Set-Location 'C:\Users\Radhika V Bhosale\Downloads\Dravyaguna (2)\Dravyaguna\Dravyaguna'
$env:VITE_USE_API = 'true'
$env:VITE_API_BASE_URL = 'http://localhost:4000'
npm.cmd run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`; verify backend readiness at `http://localhost:4000/api/health`. These commands assume the existing local PostgreSQL service at port `54334` is already running. Staging needs separately configured host environment variables and must not use these local values.

## Account and role setup

Backend roles: `admin`, `domain_expert`, `editor`, `clinician`. “Doctor” and regular “User” map to `clinician`; “Ayurvedic Reviewer” maps to `domain_expert`. Local test users are `dev-admin@test.com`, `dev-expert@test.com`, `dev-editor@test.com`, and `dev-clinician@test.com`; use only the locally configured development password. Do not seed these users into staging or production. Staging's first admin must be created with `npm run admin:first` from `backend/` using the host's verified staging database connection.

## Route-by-role manual checks

Status is `WIRED-UNVERIFIED` until the owner completes the click-through. Rows marked “denied” should show the access-denied/redirect state and must also be covered by backend authorization.

| Page / route | Role | Manual check and expected result | Clicked | Status |
|---|---|---|---|---|
| Landing `/` | Public | Load landing page and follow the sign-in link. | [ ] | WIRED-UNVERIFIED |
| Authentication `/auth` | Public | Sign in; verify role-specific redirect. Try a wrong password and confirm an error with no local API-mode login. | [ ] | WIRED-UNVERIFIED |
| Password reset `/password-reset` | Public | Request a reset and confirm generic response. Reset links cannot arrive until SMTP delivery is configured. | [ ] | BLOCKED |
| Help/support `/help-support` | Public | Load the page and verify navigation back to product pages. | [ ] | WIRED-UNVERIFIED |
| Upgrade `/upgrade` | Public | Load the page; confirm no purchase is represented as successful. | [ ] | WIRED-UNVERIFIED |
| Payment `/payment` | Public | Confirm payment is unavailable and no charge/success is simulated. | [ ] | BLOCKED |
| Learn more `/learn-more` | Public | Load explanatory content and navigate back. | [ ] | WIRED-UNVERIFIED |
| Doctor dashboard `/doctor` | Admin | Load dashboard; confirm dashboard data is appropriate to this account. | [ ] | WIRED-UNVERIFIED |
| Doctor dashboard `/doctor` | Domain expert | Load dashboard; confirm dashboard data is appropriate to this account. | [ ] | WIRED-UNVERIFIED |
| Doctor dashboard `/doctor` | Editor | Load dashboard; confirm dashboard data is appropriate to this account. | [ ] | WIRED-UNVERIFIED |
| Doctor dashboard `/doctor` | Clinician | Load dashboard and verify API-backed counts/favorites where present. | [ ] | WIRED-UNVERIFIED |
| Search `/search` | Admin | Run an approved-term Simple Search and a Detailed Search. | [ ] | WIRED-UNVERIFIED |
| Search `/search` | Domain expert | Run searches and verify the language/unsupported-query note is truthful. | [ ] | WIRED-UNVERIFIED |
| Search `/search` | Editor | Run searches; verify drafts are visible only where permitted. | [ ] | WIRED-UNVERIFIED |
| Search `/search` | Clinician | Search reviewed/verified records; verify empty/error states and score breakdown. | [ ] | WIRED-UNVERIFIED |
| Search results `/search-results` | Admin | Open results and verify match ranking and details. | [ ] | WIRED-UNVERIFIED |
| Search results `/search-results` | Domain expert | Open results and verify match ranking and details. | [ ] | WIRED-UNVERIFIED |
| Search results `/search-results` | Editor | Open results and verify match ranking and details. | [ ] | WIRED-UNVERIFIED |
| Search results `/search-results` | Clinician | Open results; verify partial matches and per-parameter breakdown. | [ ] | WIRED-UNVERIFIED |
| Herb library `/herb-library` | Admin | Browse, filter, paginate, and open a herb. | [ ] | WIRED-UNVERIFIED |
| Herb library `/herb-library` | Domain expert | Browse, filter, paginate, and open a herb. | [ ] | WIRED-UNVERIFIED |
| Herb library `/herb-library` | Editor | Verify drafts are included and pagination reaches all records. | [ ] | WIRED-UNVERIFIED |
| Herb library `/herb-library` | Clinician | Verify only reviewed/verified records appear. | [ ] | WIRED-UNVERIFIED |
| Herb detail `/herb/:id` | Admin | Verify fields, references, image URL behavior, favorite, translation label, and InfoIcon. | [ ] | WIRED-UNVERIFIED |
| Herb detail `/herb/:id` | Domain expert | Verify fields; test language selector and translation verification control when configured. | [ ] | WIRED-UNVERIFIED |
| Herb detail `/herb/:id` | Editor | Verify allowed record visibility and no Verify action. | [ ] | WIRED-UNVERIFIED |
| Herb detail `/herb/:id` | Clinician | Verify reviewed/verified visibility, favorite, and denied draft IDs. | [ ] | WIRED-UNVERIFIED |
| Compare `/compare` | Admin | Select 2–3 IDs and verify all herb data is read from the API. | [ ] | WIRED-UNVERIFIED |
| Compare `/compare` | Domain expert | Select 2–3 IDs and verify all herb data is read from the API. | [ ] | WIRED-UNVERIFIED |
| Compare `/compare` | Editor | Select 2–3 IDs and verify all herb data is read from the API. | [ ] | WIRED-UNVERIFIED |
| Compare `/compare` | Clinician | Compare visible herbs; confirm local storage contains IDs only. | [ ] | WIRED-UNVERIFIED |
| Favorites `/favorites` | Admin | Add/remove a favorite and confirm reload persistence. | [ ] | WIRED-UNVERIFIED |
| Favorites `/favorites` | Domain expert | Add/remove a favorite and confirm reload persistence. | [ ] | WIRED-UNVERIFIED |
| Favorites `/favorites` | Editor | Add/remove a favorite and confirm reload persistence. | [ ] | WIRED-UNVERIFIED |
| Favorites `/favorites` | Clinician | Add/remove a favorite and confirm per-user isolation. | [ ] | WIRED-UNVERIFIED |
| Profile `/profile` | Admin | Edit allowed profile fields and confirm persisted values after reload. | [ ] | WIRED-UNVERIFIED |
| Profile `/profile` | Domain expert | Edit allowed profile fields and confirm persisted values after reload. | [ ] | WIRED-UNVERIFIED |
| Profile `/profile` | Editor | Edit allowed profile fields and confirm persisted values after reload. | [ ] | WIRED-UNVERIFIED |
| Profile `/profile` | Clinician | Edit allowed profile fields and confirm persisted values after reload. | [ ] | WIRED-UNVERIFIED |
| Settings `/settings` | Admin | Change account-backed preferences; confirm UI-only preferences stay local. | [ ] | WIRED-UNVERIFIED |
| Settings `/settings` | Domain expert | Change account-backed preferences; confirm UI-only preferences stay local. | [ ] | WIRED-UNVERIFIED |
| Settings `/settings` | Editor | Change account-backed preferences; confirm UI-only preferences stay local. | [ ] | WIRED-UNVERIFIED |
| Settings `/settings` | Clinician | Change search preferences and verify them after reload. | [ ] | WIRED-UNVERIFIED |
| Language `/language` | Admin | Save language preference and verify stored preference; full interface localization is unavailable. | [ ] | WIRED-UNVERIFIED |
| Language `/language` | Domain expert | Save language preference and verify stored preference; full interface localization is unavailable. | [ ] | WIRED-UNVERIFIED |
| Language `/language` | Editor | Save language preference and verify stored preference; full interface localization is unavailable. | [ ] | WIRED-UNVERIFIED |
| Language `/language` | Clinician | Select a herb-detail language and verify only machine-translated fields change. | [ ] | WIRED-UNVERIFIED |
| Admin dashboard `/admin` | Admin | Verify metrics and recent data come from APIs; confirm empty/error states. | [ ] | WIRED-UNVERIFIED |
| Admin dashboard `/admin` | Domain expert | Verify allowed dashboard metrics; user/admin-only data remains inaccessible. | [ ] | WIRED-UNVERIFIED |
| Admin dashboard `/admin` | Editor | Expect access denied. | [ ] | WIRED-UNVERIFIED |
| Admin dashboard `/admin` | Clinician | Expect redirect out of the admin area. | [ ] | WIRED-UNVERIFIED |
| Manage herbs `/admin/manage-herbs` | Admin | Create, edit, archive; confirm database persistence and audit. | [ ] | WIRED-UNVERIFIED |
| Manage herbs `/admin/manage-herbs` | Domain expert | Create/edit and Verify; archive must be denied. | [ ] | WIRED-UNVERIFIED |
| Manage herbs `/admin/manage-herbs` | Editor | Create/edit drafts and submit review; Verify/archive must be denied. | [ ] | WIRED-UNVERIFIED |
| Manage herbs `/admin/manage-herbs` | Clinician | Expect redirect/access denial and backend 403 on writes. | [ ] | WIRED-UNVERIFIED |
| Add/edit herb `/admin/add-herb` | Admin | Save draft, edit fields, test image upload only when Storage is configured. | [ ] | WIRED-UNVERIFIED |
| Add/edit herb `/admin/add-herb` | Domain expert | Edit/verify an approved test record; verify edit status rules. | [ ] | WIRED-UNVERIFIED |
| Add/edit herb `/admin/add-herb` | Editor | Create draft/edit and verify 400 field errors; Verify action must be absent/denied. | [ ] | WIRED-UNVERIFIED |
| Add/edit herb `/admin/add-herb` | Clinician | Expect redirect/access denial. | [ ] | WIRED-UNVERIFIED |
| Vocabulary `/admin/vocabulary` | Admin | Create term; edit/merge/delete only unused terms; verify relinking and audit. | [ ] | WIRED-UNVERIFIED |
| Vocabulary `/admin/vocabulary` | Domain expert | Create terms; existing-term edit/merge/delete must be denied. | [ ] | WIRED-UNVERIFIED |
| Vocabulary `/admin/vocabulary` | Editor | Create terms; existing-term edit/merge/delete must be denied. | [ ] | WIRED-UNVERIFIED |
| Vocabulary `/admin/vocabulary` | Clinician | Expect redirect/access denial. | [ ] | WIRED-UNVERIFIED |
| Scoring `/admin/scoring` | Admin | Change a weight; run a search and verify the next score uses it; restore baseline. | [ ] | WIRED-UNVERIFIED |
| Scoring `/admin/scoring` | Domain expert | Change a weight; run a search and verify the next score uses it; restore baseline. | [ ] | WIRED-UNVERIFIED |
| Scoring `/admin/scoring` | Editor | Expect access denied and backend 403 for changes. | [ ] | WIRED-UNVERIFIED |
| Scoring `/admin/scoring` | Clinician | Expect access denied and backend 403 for changes. | [ ] | WIRED-UNVERIFIED |
| Analytics `/admin/search-analytics` | Admin | Verify totals, zero/weak results, recent queries, and language breakdown when available. | [ ] | WIRED-UNVERIFIED |
| Analytics `/admin/search-analytics` | Domain expert | Verify analytics access and data. | [ ] | WIRED-UNVERIFIED |
| Analytics `/admin/search-analytics` | Editor | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Analytics `/admin/search-analytics` | Clinician | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Users `/admin/users` | Admin | Create user, change role, deactivate/reactivate; confirm last-admin and self-action guards. | [ ] | WIRED-UNVERIFIED |
| Users `/admin/users` | Domain expert | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Users `/admin/users` | Editor | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Users `/admin/users` | Clinician | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Audit log `/admin/audit-log` | Admin | Verify actor, before/after, filters, and audited mutations. | [ ] | WIRED-UNVERIFIED |
| Audit log `/admin/audit-log` | Domain expert | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Audit log `/admin/audit-log` | Editor | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Audit log `/admin/audit-log` | Clinician | Expect access denied and backend 403. | [ ] | WIRED-UNVERIFIED |
| Admin profile `/admin/profile` | Admin | Edit name/email; confirm persisted; photo upload remains separate from profile photo. | [ ] | WIRED-UNVERIFIED |
| Admin profile `/admin/profile` | Domain expert | Edit own name/email; confirm persisted. | [ ] | WIRED-UNVERIFIED |
| Admin profile `/admin/profile` | Editor | Edit own name/email; confirm persisted. | [ ] | WIRED-UNVERIFIED |
| Admin profile `/admin/profile` | Clinician | Expect redirect from admin layout; use `/profile` instead. | [ ] | WIRED-UNVERIFIED |
| Admin settings `/admin/settings` | Admin | Verify account settings load/save and failed requests show errors. | [ ] | WIRED-UNVERIFIED |
| Admin settings `/admin/settings` | Domain expert | Verify account settings load/save and failed requests show errors. | [ ] | WIRED-UNVERIFIED |
| Admin settings `/admin/settings` | Editor | Verify account settings load/save and failed requests show errors. | [ ] | WIRED-UNVERIFIED |
| Admin settings `/admin/settings` | Clinician | Expect redirect from admin layout; use `/settings` instead. | [ ] | WIRED-UNVERIFIED |
| Admin language `/admin/language` | Admin | Save English/Hindi/Marathi/Sanskrit preference; verify selected language after reload. | [ ] | WIRED-UNVERIFIED |
| Admin language `/admin/language` | Domain expert | Save preference; confirm admin language page role boundary. | [ ] | WIRED-UNVERIFIED |
| Admin language `/admin/language` | Editor | Save preference; confirm persistence after reload. | [ ] | WIRED-UNVERIFIED |
| Admin language `/admin/language` | Clinician | Expect redirect from admin layout; use `/language`. | [ ] | WIRED-UNVERIFIED |
| Admin upgrade `/admin/upgrade-plan` | Admin | Confirm no plan purchase is represented as successful. | [ ] | WIRED-UNVERIFIED |
| Admin upgrade `/admin/upgrade-plan` | Domain expert | Confirm no plan purchase is represented as successful. | [ ] | WIRED-UNVERIFIED |
| Admin upgrade `/admin/upgrade-plan` | Editor | Confirm page is informational and billing is unavailable. | [ ] | WIRED-UNVERIFIED |
| Admin upgrade `/admin/upgrade-plan` | Clinician | Expect redirect from admin layout. | [ ] | WIRED-UNVERIFIED |

## Runtime and release checks

- [ ] Confirm `GET /api/health` returns HTTP 200 with database status `ok`.
- [ ] Confirm frontend deep links `/herb-library`, `/admin/manage-herbs`, and `/password-reset` load from the staging host.
- [ ] Confirm a herb/profile/settings/favorite/saved-search mutation survives reload and is isolated between two authorized accounts.
- [ ] Confirm clinician/editor/reviewer negative permissions receive real backend 403s where specified.
- [ ] Confirm failed network requests never show success.
- [ ] Do not run the checklist against production before the owner approves release.

## Blocking inputs for staging

Provide staging-only Supabase project/session-pooler URL and `DATABASE_URL`, `JWT_SECRET`, exact `FRONTEND_ORIGIN`, Render/Vercel access, and the staging frontend/API URLs. To enable integrations, provide Supabase Storage URL/service-role key/bucket, SMTP account and sender, an LLM provider/key/model, and Sarvam key (optionally Google or Azure translation credentials). Provide Sentry DSN if error monitoring is required. The company Ayurveda expert must approve vocabulary mappings and definitions and confirm the source-data decisions. The production database password and JWT secret must be newly rotated; do not send their values in chat or commit them.
