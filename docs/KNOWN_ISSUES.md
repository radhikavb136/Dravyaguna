# Known issues and release dependencies

Updated 2026-10-21. See [`PHASE_STATUS.md`](./PHASE_STATUS.md) for verified scope and test results.

## Database test safety

- `backend/.env` points at a Supabase pooler URL, but `DEV_DB_REF` is not configured. The backend test runner correctly rejects that target because it cannot prove it is the allowlisted development project. Do not guess or add a project reference to bypass the guard.
- Latest integration coverage ran against a new isolated embedded PostgreSQL cluster at port 54333, migrated and populated from the repository's frontend dataset and dev seed scripts. The older local cluster on port 54331 refused connections with a shared-memory-in-use error; it was left untouched. The `db:embedded` script checks for `PG_VERSION` before init to avoid reinitializing existing data. Use a new local directory if an existing cluster cannot start; do not delete or reset the older directory.
- `.env`-default migration attempt in this continuation was denied before connecting to the unverified Supabase host. No remote migration ran. Local migration and tests succeeded with `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54333/dravyaguna`; API tests also require `API_BASE_URL` to match the local API server port.
- Before running against Supabase, configure and independently confirm the exact development project reference with the project owner. Never test against production.

## Data and search issues

- Indication vocabulary remains empty until the domain-approved `vocab_review.csv` mapping is applied. Condition search coverage is consequently limited.
- Simple Search uses canonical Karma/Indication terms and expert-entered `term_synonyms`; PostgreSQL fuzzy suggestions require similarity 0.45 plus an 80% relative cutoff and never persist links. Unknown phrases return zero and are logged asynchronously. `backend/data/search-synonyms-starter.csv` is draft-only and unloaded; expert-approved mappings are still needed for broader coverage.
- Sanskrit names in the source can be incorrect; do not auto-correct them.
- There is no approved Organ (Avayava) dataset; keep the filter disabled until one is supplied.
- Search history is a browser-side convenience. Favorites and saved searches are account-backed.
- Compare stores herb IDs in browser storage and loads herb records from the API; comparison selection is not synchronized between devices.

## Product capabilities requiring external services

- Password reset API, hashed single-use tokens, expiry, throttling, and UI are wired and backend-tested; the sender is a no-output stub, so real users cannot receive links until SMTP delivery is implemented and configured. Email address changes likewise require a verification-mail service.
- Herb image upload is wired with magic-byte/size checks and backend role enforcement; persistent upload is blocked until Supabase Storage URL, service-role key, bucket, and read policy are configured. Tests refuse external storage writes.
- Explain/RAG now has repeatable ingestion for stored herb records and authorized Markdown, text, JSON, and JSONL files; keyword retrieval, metadata-preserving chunks, role filtering, evidence citations, cache, and insufficient-evidence behavior are locally integration-tested. The current indexed corpus is project herb records only; no authorized classical reference corpus or semantic/vector backend is present. The default mock is visibly identified as non-AI (`ai_generated: false`). Live OpenAI generation remains blocked until `LLM_API_KEY` and `LLM_MODEL` are supplied.
- Two-factor setup, session listing/revocation, account export, and audit rollback are unavailable; the unsupported controls are disabled or marked unavailable in the UI.
- Herb detail can request and cache descriptive field translations through Sarvam, Google, Azure, or the mock provider, and admins/domain experts can verify cached output. Live providers remain unverified without keys; mock text is not clinical content. Search-query translation, full interface localization, and vocabulary definition translations are not implemented. User language preference and the herb-detail selector are present but do not translate unrelated pages.
- Explain retrieval currently uses indexed stored herb records and authorized source files; it returns source metadata and evidence passages, with no external vector index. Current source rows are company project data rather than an independently curated classical reference corpus. Clinical explanations still depend on source quality/completeness, and live text generation needs provider credentials.
- Billing/payment is not connected to a payment provider.
- Admin CSV and OOXML XLSX export are available and tested against current database rows. Workbook validity is checked at the ZIP/XML part level in backend tests; compatibility with desktop spreadsheet applications has not been manually click-tested.
- Search ranking now limits candidates before building breakdown JSON; local EXPLAIN and pool 5/10 measurements are documented in `PHASE_STATUS.md`. Supabase performance and the historical reported throughput plateau remain unverified.
- Production hosting, secrets, monitoring, backup/restore, and database policy deployment have not been verified. Review RLS/policies and service-role access before production.
- Migration 011 enables RLS on every public table and adds no policies. This was applied and checked only on the isolated local test database. Supabase Security Advisor/Table Editor verification remains outstanding.
- Render/Vercel deployment configs and names-only env templates are present, but no staging deployment was performed because the staging database URL, hosting accounts, and deployment secrets are unavailable.
- The one-time first-admin script requires an interactive terminal and hides password input; it has not created an account on staging. The dev-user seed's production refusal is regression-tested.
- Docker is not installed in the current environment, so Docker image builds remain unverified. The non-Docker API-enabled Vite production bundle was built and checked for six mock persistence keys.

## UI and test coverage

- Latest frontend Vitest coverage is 24 tests across 6 files (`npm.cmd test -- --run`). A Chromium local smoke exercised clinician and domain-expert login/session restoration and denied routes, admin user-page access, and herb library/detail question submission through the RAG evidence UI; it used the explicitly labelled mock provider and is not a real-model check. Broad owner click-through remains outstanding.
- Herb verification/publish, vocabulary merge/relink/protected deletion, user status mutation, detailed search filters, and compare selection still need browser-level checks. Herb/vocabulary CRUD and permission protections have backend API coverage.
- Latest backend suite passed against the isolated local database and fresh API: `npm.cmd test` → 23 passed, 0 failed, 23 total. It includes RAG ingestion/retrieval/citation, role visibility, missing-model-credentials, and failure-degradation checks. The Supabase URL remains unverified and was not used.
- ESLint passes with 39 warnings and 0 errors, mostly React Compiler migration, effect, and dependency warnings. Resolve these without changing page behavior.
- Production frontend build passes with a 621.36 kB JS chunk warning. `npm.cmd run verify:api-build` reports `PASS API production bundle excludes 6 mock persistence keys.` Offline audits of frontend and backend reported 0 vulnerabilities using cached audit data; this does not verify current online advisory data.
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
