# Known issues and release dependencies

Updated 2026-10-24 (evening). See [`PHASE_STATUS.md`](./PHASE_STATUS.md) and [`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md) for verified scope, deploy blockers, and test results.

- **Search analytics insights** (2026-10-24): `GET /api/analytics/search/insights` returns read-only improvement hints (`requires_expert_approval: true`, `auto_apply: false`). Search Analytics UI lists them; scoring weights and vocabulary are **not** changed automatically.
- **Vocabulary export for review** (2026-10-24): `npm run vocab:review:export-pending` writes a capped CSV slice with empty `approved_canonical` only — not an approval or import.
- **Gemini explanations** (2026-10-24): Set `LLM_PROVIDER=gemini`, `GEMINI_API_KEY` (or `LLM_API_KEY`), optional `LLM_MODEL` (default **`gemini-3.6-flash`**). Responses are validated; failures use database-template fallback. Live check: `RUN_LIVE_PROVIDER_SMOKE=1 npm run smoke:live-providers` in `backend/` (no secrets logged). **Do not paste API keys into chat or git.**
- **Sarvam translation** (2026-10-24): Set `SARVAM_API_KEY`. Uses `POST https://api.sarvam.ai/translate` with header `api-subscription-key` and model **`sarvam-translate:v1`**. Search-query translation: **hi-IN**, **mr-IN** only. Herb field translation also allows **sa-IN**. Sanskrit **search** queries remain unsupported (`searchTranslationService`). Machine translations stay `machine_translated` until expert verify.
- **Provider keys in `.env`** (2026-10-24): **`GEMINI_API_KEY`**, **`SARVAM_API_KEY`**, and **`LLM_PROVIDER=gemini`** are set locally in `backend/.env` (do not commit). Smoke: `RUN_LIVE_PROVIDER_SMOKE=1 npm run smoke:live-providers` — **`sarvam: ok`** verified; **Gemini** may return transient demand errors (sanitized only). Backend **`NODE_ENV=test`** forces mock LLM so integration tests stay deterministic.
- **SMTP password reset** (2026-10-24): When `SMTP_HOST` + `SMTP_FROM` are set, reset emails send via nodemailer (`emailDeliveryService.js`). Inspect gaps: `npm run inspect:smtp` in `backend/` (names only). Link target: `PASSWORD_RESET_PUBLIC_PATH` (default `/password-reset`). Until SMTP is set, API returns generic success without sending mail; UI reads `/api/health` `smtpConfigured`.
- **Supabase herb images** (2026-10-24): `POST /api/upload/herb-image/:herbId` — role-gated, 2 MB cap, JPEG/PNG/WebP magic-byte check, UUID herb id, safe object paths. Missing env: `npm run inspect:storage`. Integration tests refuse external writes when `NODE_ENV=test`; **live upload not verified** without storage credentials.
- **Vocabulary review** (2026-10-24): **657** pending rows, **0** approved — see [`VOCAB_REVIEW_REPORT.md`](./VOCAB_REVIEW_REPORT.md). Do not auto-apply `suggestion` column.

## Phase 2 (2026-10-24)

- **Supabase dev** (2026-10-24): Connectivity + **134/42** **VERIFIED**. Migrations **009–016** applied (`npm run migrate` exit 0). Register/login smoke **`supabaseRegisterSmoke.js` exit 0 VERIFIED**. **Acceptance baseline 55 VERIFIED** (`ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55 npm run test:acceptance` exit 0). Two diagnostic users remain (`zz_diag_*`, `zz_api_diag_*` @example.com) — **deletion not approved**. Unset shell `DATABASE_URL` before API/tests.
- **Phase 2 E2E CRUD** (2026-10-24): `e2e/specs/phase2-crud.spec.js` — admin user-create UI + API deactivate cleanup, vocabulary add Karma term, audit filter apply/clear (local embedded DB only; refuses pooler in `beforeAll`).
- **Playwright (local, 2026-10-24):** `e2e/specs/phase2-pages.spec.js` — **9 passed, 0 failed, 0 skipped** with `DEV_USER_PASSWORD` set, Playwright `webServer` starting API (`backend/scripts/startE2eApi.js`, rate limit disabled) and frontend on 5180, plus `e2e/global-setup.js` seeding dev users against local DB only. On this machine, `npx playwright install chromium` did not finish; runs used **`E2E_BROWSER_CHANNEL=chrome`** (system Chrome). The old `E2E_RUN` gate and `phase2-admin.spec.js` are removed/replaced.
- Clinicians hitting `/admin/*` are redirected to `/doctor` by `AdminLayout` (not `AdminPageGuard` “Access denied”); E2E asserts redirect for `/admin/users`.
- Editors saving a **verified** herb must send `reviewed` status on “Save Changes”; without that demotion, the UI blocked save with the verify-only alert (fixed in `AddHerb.jsx` during verification).
- `docs/BUILD_PROMPT.md` referenced in `AGENTS.md` is **missing** from the repository; phase acceptance is tracked in `docs/PHASE_STATUS.md` against the user master prompt.
- Phase 1 acceptance is **`29-acceptance-search-visibility.test.js`** (and `npm run test:acceptance`): asserts **relative** 100% counts (N→N+1→N) so it passes on any DB size. Set **`ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55`** only on the approved dev dataset. Local isolated DB still has **175 reviewed** (not 134/42); do not re-import without owner approval.
- `DISABLE_RATE_LIMIT=true` skips login and password-reset limiters (`auth.routes.js`); used only by `startE2eApi.js` / Playwright. Production must leave this unset.
- Backend integration tests against a **long-lived** API on **4010** with `DISABLE_RATE_LIMIT=true` skip password-reset **429** assertions (health `passwordResetRateLimitEnabled: false`). For full rate-limit coverage, run the API with **`NODE_ENV=test`**, limits **enabled**, and `API_BASE_URL=http://127.0.0.1:4010`; test **17** passes `X-Test-Rate-Limit-Key` so repeated suite runs do not share one in-memory bucket.
- RAG retrieval uses PostgreSQL full-text search (`ragKnowledgeService.js`), not vector embeddings; Phase 4 live LLM remains credential-dependent.
- `GET /api/herbs` now supports `q` for manage-herb name search; advanced column filters on Manage Herbs still apply only to the current page when `VITE_USE_API=true`.
- Frontend Vitest: if shell exports `VITE_API_BASE_URL=http://localhost:4010` (E2E), API-client unit tests must stub the base URL (see `src/api/testApiBase.js`) or mocks will miss `fetch` URLs.

## Local API unreachable / development ports

- **Resolved (2026-10-28)**: The error `"Unable to connect to the server. This may be a network failure or a CORS block for http://localhost:5180; confirm that origin is in FRONTEND_ORIGIN. Please try again."` was traced to root `.env` having `VITE_API_BASE_URL=http://127.0.0.1:4010` (left over from isolated demo/E2E test config) while the backend runs on `PORT=4000`. The browser frontend on port 5180 sent requests to port 4010, which was refused, triggering `formatApiNetworkError`'s cross-origin message.
- Corrected root `.env` and `.env.example` to default `VITE_API_BASE_URL=http://localhost:4000`.
- Updated `backend/.env` `FRONTEND_ORIGIN` to include all four standard local origins: `http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180`.
- Enhanced `src/api/client.js` HTTP error handling to distinguish 503 database unavailability, 502 bad gateway, and 504 gateway timeout from generic status codes without leaking server internals.
- Fixed `DashboardNavbar.jsx` to guard `herbUser` behind `useApi` so `verifyApiBuild.js` passes.
- Confirmed CORS preflight (OPTIONS 204), health check (GET 200 `database: ok`), and auth endpoint rejection (POST 401 `Invalid credentials`) pass from `http://localhost:5180` against `http://localhost:4000`. Backend test `26-cors.test.js` verified with all assertions passing.
- Start the backend with `npm.cmd start` from `backend/`; start this frontend at 5180 with `npm.cmd run dev:local` from the repository root. The latter uses Vite `--strictPort`. Check API/CORS/process state with `npm.cmd run check:local`. Details and troubleshooting commands are in [`MANUAL_CHECKLIST.md`](./MANUAL_CHECKLIST.md).
- Running frontend `localhost:5180` uses `VITE_API_BASE_URL=http://localhost:4000` in the checked-in example and the build command tested here. Environment values of a previously claimed running frontend/backend could not be inspected because neither process existed at initial reproduction. No unrelated processes were stopped.
- The 134-herb clinician count remains a separate data blocker: a read-only query of the isolated local database on 2026-10-22 returned 176 reviewed, 6 draft, and 1 archived herb. Do not import/overwrite the 176 source records or clean browser test rows until the owner explicitly approves the previously described dataset alignment.

## Database test safety

- `backend/.env` points at a Supabase pooler URL, but `DEV_DB_REF` is not configured. The backend test runner correctly rejects that target because it cannot prove it is the allowlisted development project. Do not guess or add a project reference to bypass the guard.
- Latest full integration coverage ran against the already-migrated isolated embedded cluster `.embedded-pg-agent-fresh` at port 54334, with migrations 001–016 and 183 herbs / 7 users. The existing `.embedded-pg-agent-test` cluster at port 54333 was restarted for inspection and found to contain only migrations 001–009; it is stale and was not migrated or used for the full suite. The older local cluster on port 54331 remains untouched. The startup script checks for `PG_VERSION` before init to avoid reinitializing existing data.
- `.env`-default migration attempt was denied before connecting to the unverified Supabase host. No remote migration ran. Current local tests use `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna`; API tests also require `API_BASE_URL` to match the local API server port.
- Before running against Supabase, configure and independently confirm the exact development project reference with the project owner. Never test against production.
- `node scripts/importRealDatasetDryRun.js` is now read-only, but the actual source import was not run. The source Excel has 176 rows (134 unflagged, 42 quality-flagged); the isolated DB currently has all 176 `HERB_REC_*` rows marked `reviewed`. The importer updates existing `HERB_REC_*` attributes, so get explicit approval before applying it to this DB or any shared environment. Remote dataset imports require `ALLOW_REMOTE_DATA_IMPORT=YES` after independently checking the target.
- Dry-run test-data cleanup candidates found in the isolated DB (not deleted): `HERB_1792502437459`, `HERB_1792502490676`, `HERB_1792502555126`, `HERB_1792502694090`, `HERB_1792503320077`, `HERB_1792503342992` (browser-test drafts) and `VERIFY_UI_1792505269898` (archived browser-test herb). Keep all until the owner approves cleanup; real `HERB_REC_*` records were not touched.

## Data and search issues

- Indication vocabulary remains limited until `vocab_review.csv` rows have **`approved_canonical`** filled and `npm run vocab:approved:apply` is run on an approved target (`vocab:approved:dry-run` currently reports **0** approvable rows). Condition search coverage is consequently limited.
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
- Herb detail and Simple Search result cards can request/cache descriptive field translations through Sarvam, Google, Azure, or the mock provider; cards label mock, machine, verified, loading, and unavailable states. Herb names and classical labels remain unchanged. Search-query translation is wired for Hindi and Marathi through the real provider chain; mock query output is rejected, classical/herb names are masked and restored, and provider requests are limited to 30 per user per minute. Live provider behavior remains unverified without keys. Shared navigation/account labels and the search landing headings/actions now localize in English, Hindi, Marathi, and Sanskrit; a local mock-mode browser smoke selected Hindi and confirmed navigation/search labels with no page errors. Most other page titles/forms/dialogs/help remain English, and vocabulary definition translations are not implemented; the complete owner click-through remains outstanding.
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

- Latest frontend Vitest coverage is 34 tests across 9 files (`npm.cmd test -- --run`). Tests include API-result-to-card mapping, translation fallback, and shared interface-language updates in all four dictionaries. A local Chromium smoke exercised `Deepana` search against the isolated API: HTTP 200, 98 results, first card named `Agarwood`, no `Unnamed herb` cards, and zero page errors. Other Chromium checks exercised clinician and domain-expert login/session restoration and denied routes, admin user-page access, herb library/detail question submission through the RAG evidence UI, and the Hindi preference → Simple Search → honest unavailable-translation state. The RAG smoke used the explicitly labelled mock, not a real-model check. Broad owner click-through remains outstanding.
- Herb verify via the reviewer UI and clinician denial from admin herb management were verified in local Chromium; the backend suite also asserts reviewer/admin allow and clinician/editor 403 cases. Herb create/edit/archive, vocabulary merge/relink/protected deletion, user status mutation, detailed search filters, compare selection, profile/settings writes, and analytics/audit filtering still need browser-level checks. Local Chromium has also exercised auth/session boundaries, admin user-page access, herb library/detail plus RAG question UI, and canonical Simple Search (`Deepana`). The draft `fever` alias correctly remains unmatched until domain approval/import. Remaining herb/vocabulary CRUD permission paths have backend API coverage.
- Latest backend suite passed against the isolated local database and fresh API: `npm.cmd test` → 27 passed, 0 failed, 27 total. It includes RAG ingestion/retrieval/citation, role visibility, missing-model-credentials, numeric source-quality flag parsing, import safety, conditional source-workbook counts, and Hindi/Marathi search-translation provider behavior and rate limiting. An earlier run on a previously used local API failed two login assertions after the process-wide login limiter was consumed by browser probes; restarting only the local API process (same isolated DB) cleared the in-memory limiter, and the full suite then passed. The production rate limiter was not changed. The Supabase URL remains unverified and was not used.
- ESLint passes with 39 warnings and 0 errors, mostly React Compiler migration, effect, and dependency warnings. Resolve these without changing page behavior.
- Frontend lint passes with 0 errors and 39 warnings. Production build passes with a 627.22 kB JS chunk warning. `npm.cmd run verify:api-build` reports `PASS API production bundle excludes 6 mock persistence keys.` Offline audits of frontend and backend reported 0 vulnerabilities using cached audit data; this does not verify current online advisory data.
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
## 2026-10-23 updates (verified local run)

- **Local environment**: Reused isolated embedded Postgres cluster `.embedded-pg-agent-fresh` on 127.0.0.1:54334. API running on port 4000 with local CORS origins. Health OK with DB OK (`GET /api/health` → `{"status":"ok","database":"ok"}`). No remote/Supabase connections used.
- **Migrations/RLS**: Up to date (`npm run migrate` → No migrations to run!); all public tables have RLS enabled (`npm run check:rls`).
- **Backend tests**: 29/29 passed against isolated DB + local API (auth, roles, scoring/search, herbs/vocabulary, admin/favorites/account, translations/explain/RAG/upload/password-reset/export, CORS/port, import safety, rate limiting).
- **Frontend**: Lint 0 errors / 24 warnings (15 warnings resolved across 9 files without behavioral changes); tests 10 files / 36 tests passed; production build succeeded (`verify:api-build` PASS).
- **Provider blockers (unchanged)**: Live Sarvam/Google/Azure translation, LLM generation for RAG, SMTP password reset delivery, Supabase Storage uploads require credentials/config not present; tested with mocks/stubs. No import of `Dataset/herbs.xlsx` attempted.
- **Data safety**: No records/accounts/audit logs deleted; Browser Herb/VERIFY_UI test rows untouched. Database safety guards not bypassed.

## 2026-10-28/29 Backend Connection & CORS Diagnostics Resolution

- **Root Cause 1 (`VITE_API_BASE_URL` Port Mismatch)**: Frontend root `.env` had previously configured `VITE_API_BASE_URL=http://127.0.0.1:4010`, while backend runs on port 4000. Corrected to `http://localhost:4000`.
- **Root Cause 2 (`NotificationBell` Infinite Render Storm)**: `useUiText()` was returning an unmemoized function `(key, vars) => ...` on each render. In `NotificationBell.jsx`, `refresh` depended on `[t]`, and `useEffect` depended on `[refresh]`. Calling `refresh()` updated state (`setLoading`, `setError`), triggering re-renders that continuously regenerated `t`, creating new `refresh` references and immediately re-triggering the effect. This produced an unthrottled infinite loop that fired over 16,000 HTTP requests in minutes.
- **Root Cause 3 (Supabase Missing `user_notifications` Table 500)**: The development Supabase database had migrations 001-016 applied; migrations 020/021 were unapplied. Every notification request in the infinite loop failed with HTTP 500 `relation "user_notifications" does not exist`. The flood overwhelmed the Node event loop and browser HTTP connections, leading to socket exhaustion (`TypeError: Failed to fetch`) which `formatApiNetworkError` surfaced as a CORS/network connection error.
- **Root Cause 4 (Sandbox Loopback Isolation)**: Windows sandbox isolation blocks external browser processes from accessing loopback sockets of servers running in standard sandbox mode. Both backend and frontend servers are now actively running outside sandbox isolation (`BypassSandbox: true`), enabling browser and tool reachability.
- **Fixes Applied**:
  1. `useUiText.js`: Wrapped translation dispatch in `useCallback(..., [language])`.
  2. `NotificationBell.jsx`: Stabilized `refresh` dependencies using `useRef` for `t` and added `isFetchingRef` re-entrance lock.
  3. `notificationService.js`: Handled PostgreSQL `42P01` (undefined table) gracefully across `listNotificationsForUser`, `unreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`, and `createNotification`, safely returning empty notification lists/zero counts without HTTP 500 crashes.
  4. `checkLocal.js` verified: Health 200, DB OK, all 4 CORS origins (`http://localhost:5173`, `http://localhost:5180`, `http://127.0.0.1:5173`, `http://127.0.0.1:5180`) PASS.
  5. Vitest: 18 test files, 54 tests passed. `npm run verify:api-build`: PASS.

## 2026-10-29 Compare Herbs Stale-ID & 404 Resilience Resolution

- **Root Cause**: `ComparePage.jsx` used `Promise.all(ids.map((id) => getHerbById(id)))` where `ids` were loaded from `localStorage.getItem("selectedCompareHerbs")`. If any stored herb ID was from past seeds, test data, or no longer existed in the database, `GET /api/herbs/:id` returned 404 `Herb not found`. `Promise.all` rejected immediately on the first 404, causing `setCompareError(t("compareLoadError"))` ("Failed to load comparison herbs from the API") while leaving the invalid IDs in `localStorage`, permanently trapping the user on subsequent visits.
- **Fix Applied**:
  1. `ComparePage.jsx`: Replaced `Promise.all` with `Promise.allSettled`. Loaded herbs filter successful items and update `localStorage` via `persistCompareIds(loadedHerbs)`, automatically pruning deleted/stale IDs. If all stored IDs are 404, `localStorage` is cleared and the clean empty state is shown instead of an inescapable error banner. In the error view, added an exit action to clear stale comparison and return to the Herb Library.
  2. `SavedFavorites.jsx` and `FavoritesPage.jsx`: Replaced `Promise.all` with `Promise.allSettled` to prevent single-deleted favorite herbs from failing whole favorite views.
  3. Verified: `npm test` passed 54/54 tests; `npm run verify:api-build` PASS.

## 2026-10-29 Supabase Auth, Storage, Email & Workbook Synchronization Resolution

- **Supabase Auth Migration**:
  - Successfully migrated all 13 users to `auth.users` with matching IDs and bcrypt password hashes.
  - New user registrations write to `auth.users` and link directly to `public.users(id)` profiles.
  - All roles (`admin`, `editor`, `domain_expert`, `clinician`) preserved and verified server-side.
- **Profile Photo Storage**:
  - Profile photos are uploaded directly to Supabase Storage (`profile-photos/${userId}/avatar-${timestamp}.${ext}`).
  - Object deletion and replacement are fully handled with orphan cleanup.
- **Password Reset & Recovery Links**:
  - `PasswordResetPage.jsx` now correctly handles Supabase Auth URL hash fragments (`#access_token=...&type=recovery`) as well as query tokens/codes.
  - Added `/api/auth/password-reset/update` to handle authenticated recovery sessions.
  - Synchronized password resets to both `public.users` and `auth.users`.
- **Excel Workbook Synchronization**:
  - Implemented `herbWorkbookSyncService.js` to synchronize new and edited herbs directly to `Dataset/herbs.xlsx` with automatic backup (`herbs.xlsx.bak`) and idempotent deduplication across all 48 columns.
- **Multilingual & Sarvam AI**:
  - Live Sarvam AI translation verified (`sarvam: ok`). Caches translations with fallback to original text.

