# Known issues and release dependencies

Updated 2026-10-21. See [`PHASE_STATUS.md`](./PHASE_STATUS.md) for verified scope and test results.

## Database test safety

- `backend/.env` points at a Supabase pooler URL, but `DEV_DB_REF` is not configured. The backend test runner correctly rejects that target because it cannot prove it is the allowlisted development project. Do not guess or add a project reference to bypass the guard.
- Latest integration coverage ran against a new isolated embedded PostgreSQL cluster at port 54333, migrated and populated from the repository's frontend dataset and dev seed scripts. The older local cluster on port 54331 refused connections with a shared-memory-in-use error; it was left untouched. The `db:embedded` script checks for `PG_VERSION` before init to avoid reinitializing existing data. Use a new local directory if an existing cluster cannot start; do not delete or reset the older directory.
- `.env`-default migration attempt in this continuation was denied before connecting to the unverified Supabase host. No remote migration ran. Local migration and tests succeeded with `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54333/dravyaguna`; API tests also require `API_BASE_URL` to match the local API server port.
- Before running against Supabase, configure and independently confirm the exact development project reference with the project owner. Never test against production.

## Data and search issues

- Indication vocabulary remains empty until the domain-approved `vocab_review.csv` mapping is applied. Condition search coverage is consequently limited.
- Simple Search now applies the Phase B pg_trgm threshold (0.45). Search vocabulary coverage remains limited because the domain-approved `search_synonym_seeds` term set has not been provided/applied.
- Sanskrit names in the source can be incorrect; do not auto-correct them.
- There is no approved Organ (Avayava) dataset; keep the filter disabled until one is supplied.
- Search history is a browser-side convenience. Favorites and saved searches are account-backed.
- Compare stores herb IDs in browser storage and loads herb records from the API; comparison selection is not synchronized between devices.

## Product capabilities requiring external services

- Password reset returns HTTP 501 until SMTP/email token delivery is configured. Email address changes likewise require a verification-mail service.
- Herb profile photo selection is preview-only; persistent upload needs configured object storage and access controls.
- Two-factor setup, session listing/revocation, account export, and audit rollback are unavailable; the unsupported controls are disabled or marked unavailable in the UI.
- Translation needs a provider, approved translations, and verification workflow. The language setting currently records a preference; it does not translate the full interface.
- RAG needs an available retrieval/vector service and curated source content.
- Billing/payment is not connected to a payment provider.
- Production hosting, secrets, monitoring, backup/restore, and database policy deployment have not been verified. Review RLS/policies and service-role access before production.
- Migration 011 enables RLS on every public table and adds no policies. This was applied and checked only on the isolated local test database. Supabase Security Advisor/Table Editor verification remains outstanding.
- Render/Vercel deployment configs and names-only env templates are present, but no staging deployment was performed because the staging database URL, hosting accounts, and deployment secrets are unavailable.
- The one-time first-admin script requires an interactive terminal and hides password input; it has not created an account on staging. The dev-user seed's production refusal is regression-tested.
- Docker is not installed in the current environment, so Docker image builds remain unverified. The non-Docker API-enabled Vite production bundle was built and checked for six mock persistence keys.

## UI and test coverage

- Current frontend Vitest coverage is 21 tests across 5 files, including the API login session name contract, account API contract failures, role normalization/permission matrix, malformed stored session handling, admin page guards, API-authenticated routes, explicit local demo sessions, and herb search result adaptation. Earlier Chromium checks are historical manual evidence, not automated verification; remaining workflows are listed in `PHASE_STATUS.md`.
- Herb verification/publish, vocabulary merge/relink/protected deletion, user status mutation, detailed search filters, and compare selection still need browser-level checks. Herb/vocabulary CRUD and permission protections have backend API coverage.
- Backend suite currently has 15 test files and passed with `npm test`: 15 passed, 0 failed against the isolated local database.
- ESLint passes with 39 warnings and 0 errors, mostly React Compiler migration, effect, and dependency warnings. Resolve these without changing page behavior.
- API production build verification passes with `npm run verify:api-build`: `PASS API production bundle excludes 6 mock persistence keys.` The minified JavaScript chunk is approximately 610.40 kB.
- In local/demo mode (`VITE_USE_API=false`), pages may use browser storage for mock/demo data. In API mode, server-owned mutations must continue to fail visibly instead of falling back to browser-only writes.
- `npm run test:cleanup` remains dry-run unless explicitly applied. Preserve the four `dev-*@test.com` accounts and `HERB_REC_*` records.

## Resolved during the latest local verification

- Herb archive authorization now applies to the general update endpoint as well as the dedicated archive endpoint. API regression tests confirm that editors and domain experts cannot archive herbs, while admins can.
- Admin user creation, role changes, and account status changes are now audited transactionally with each database mutation; the backend suite checks these events alongside name/email edits.
- The clinician dashboard's saved-favorites widget now reads favorites/herb details from the API in API mode and displays loading/error states; its local demo storage path is compiled out of the API production bundle.
- API-mode profile headers now use the authenticated user cache instead of the mock `herbUser` record. The login adapter retains the backend full name for display.
- Search results were memoized without the API response dependency, so the UI stayed empty despite successful backend results. The dependency and match-score adaptation are fixed and verified in Chromium (fever search returned nine profiles).
- Backend HTTP request logging previously included bearer authorization headers. Pino redaction is now configured for authorization and cookie headers.
- Frontend role normalization and role-gated admin page access now handle Admin, Ayurvedic Reviewer, Doctor/User, Editor, legacy casing, and backend role identifiers. API tests verify that regular clinicians/editors cannot verify herbs and domain experts cannot access admin-only user/audit APIs; domain expert verification and analytics remain allowed. The UI control/browser workflow for herb verification is still unverified.
- The frontend permission matrix and sidebar were corrected to match server policies, including split permissions for vocabulary creation and admin-only merge/edit/delete. These checks improve navigation clarity; server middleware still decides authorization.
- Backend authentication now checks the live database role and active status for every authenticated request; tests confirm old tokens lose permissions after demotion and are rejected after deactivation. The additional database lookup should be monitored under launch traffic.
- The trigram threshold is set to 0.45 and has a backend regression assertion. The approved synonym/indication data is still unavailable, so search coverage still needs domain review.
- Custom vocabulary terms using underscore-containing names now resolve by canonical name as well as slug during herb create/update. Backend integration coverage verifies an in-use term cannot be deleted, an admin merge relinks the herb, and the target term remains protected while used.
- Every authenticated API request now checks the current user role and active status in PostgreSQL, so existing tokens cannot retain privileges after demotion or deactivation. This adds a database read per authenticated request; monitor this cost and consider a cache only if it preserves prompt revocation semantics.
