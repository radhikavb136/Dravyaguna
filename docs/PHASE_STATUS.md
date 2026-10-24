# Dravyaguna release status

Updated **2026-10-24** (Phase 0 on branch `phase-0-ground-truth`). Stopped after Phase 0 dry-run audits (no deletions/consolidations applied yet).

## Phase 0 evidence (this session)

| Step | Status | Evidence |
|---|---|---|
| 0.1 `docs/ENVIRONMENTS.md` | VERIFIED | File added; Supabase `public.users` vs Auth dashboard documented |
| 0.1 `npm run check:local` | VERIFIED | See command output below |
| 0.2 Supabase dev read-only | BLOCKED | `DEV_DB_REF` unset in workspace; use SQL block in `docs/ENVIRONMENTS.md` |
| 0.3 `seed:dev-users:supabase-dev` | WIRED-UNVERIFIED | Script + guards added; not run (no dev pooler + ref in env) |
| 0.3 `staging:remove-dev-users` | WIRED-UNVERIFIED | Script added; not run |
| 0.4 clutter audit | WIRED-UNVERIFIED | Dry-run table below; **awaiting your approval** before `git rm` |
| 0.5 duplicate audit | WIRED-UNVERIFIED | Dry-run table below; route-duplicate test added |
| 0.6 scripts/README | WIRED-UNVERIFIED | Inventory below; no script removals yet |

### Git (start of session)

- Branch: `phase-0-ground-truth` (was `phase-a0-test-foundation`)
- Unrelated frontend edits were left unstaged (not part of Phase 0 commit)

### Tests (this machine)

**Frontend** (`npm test`):

```text
Test Files  10 passed (10)
Tests       36 passed (36)
```

**Backend** — first attempt with embedded Postgres stopped:

```text
Error: connect ECONNREFUSED 127.0.0.1:54334
```

After starting embedded Postgres (`.embedded-pg-phase0` on `127.0.0.1:54334`), migrate/seed/import, `npm run rag:ingest -- --herbs`, API on port 4000 with `DISABLE_RATE_LIMIT=true`, and one `draft` herb for RAG authorization (`HERB_REC_0176`):

```text
30 passed, 0 failed, 30 total
```

**Note:** CI/fresh import has **no** `draft` herbs; `21-rag-knowledge.test.js` expects both reviewed and draft rows. Fix belongs in Phase 1 (test should create its own draft fixture).

### `npm run check:local` (2026-10-24)

```text
Backend health: localhost=OK, 127.0.0.1=OK
Backend .env DATABASE_URL endpoint: 127.0.0.1:54334
Running API reports databaseEndpoint: 127.0.0.1:54334
Users (public.users): 7
Herbs by status: reviewed=176
RLS: all public tables enabled
CORS dev origins: ... PASS (all four)
Port owners: 4000: node; 5180: none
```

### Root cause: “users don’t appear in Supabase”

**One sentence:** App users are stored in **`public.users`** (custom JWT auth), not in Supabase **Authentication → Users**; registrations also won’t show in Supabase if the running API points at **local** `127.0.0.1:54334` instead of the dev pooler.

---

## Phase 0.4 clutter audit (dry run — do not delete until approved)

| Path | Size (bytes) | Last commit | Keep? | Notes |
|---|---:|---|---|---|
| `README.md` | 6453 | 2026-10-22 | Yes | Allowed |
| `AGENTS.md` | 1763 | 2026-10-21 | Yes | Allowed |
| `docs/API.md` | 20728 | 2026-10-21 | Yes | Allowed |
| `docs/ENVIRONMENTS.md` | (new) | 2026-10-24 | Yes | Allowed |
| `docs/MANUAL_CHECKLIST.md` | 17633 | 2026-10-22 | Yes | Allowed |
| `docs/PHASE_STATUS.md` | — | — | Yes | This file |
| `docs/KNOWN_ISSUES.md` | 16684 | 2026-10-22 | Yes | Allowed |
| `docs/DEPLOY.md` | — | — | **Missing** | Create in Phase 7 from README staging section |
| `docs/PHASE_0_COMPLETE.md` | 1189 | 2026-10-11 | **Delete** | Superseded by `PHASE_STATUS.md` |
| `docs/PHASE_0_STATUS.md` | 2260 | 2026-10-21 | **Delete** | Superseded |
| `docs/PHASE_1_STATUS.md` | 5838 | 2026-10-14 | **Delete** | Superseded |
| `backend/README.md` | 1187 | 2026-10-10 | **Merge** | Overlap with root `README.md`; then delete |
| `backend/IMPLEMENTATION_PLAN.md` | 12993 | 2026-10-10 | **Delete** | AI plan; not in allowed list |
| `IMPLEMENTATION_PLAN_DETAILED.md` | (untracked) | — | **Delete** | Not tracked; not in allowed list |

`.gitignore` already covers `.env*`, `node_modules/`, `Dataset/`, `*.xlsx`, `vocab_review.csv`, `dist/`, `backend/.embedded-pg*/`.

**depcheck (backend):** reports unused `pino` (false positive — used via `pino-http`); missing `xlsx` for `scripts/checkHerb0001.js` only.

---

## Phase 0.5 duplicate audit (dry run)

### Same basename (case-insensitive) in repo

| Basename | Count | Recommendation |
|---|---:|---|
| `README.md` | 2 | Merge backend into root README; delete `backend/README.md` |
| `.env.example` | 2 | Keep both (frontend + backend) |
| `.gitignore` | 2 | Keep both |
| `package.json` / lock | 2 | Keep (monorepo layout) |
| `auth.js` | 2 | Keep (`middleware/auth.js` vs `src/auth.js` if both exist — verify paths) |
| `roles.js` | 2 | Keep if different layers |
| `Dockerfile` | 2 | Keep if frontend/backend images |

No `herb.routes.js` vs `herbs.routes.js` duplicate (only `herb.routes.js`).

### Duplicate logic

| Area | Finding | Recommendation |
|---|---|---|
| Search | Single `searchService.js` | None |
| Auth routes | Single `auth.routes.js` | None |
| Weights | Single `weightsCache.js` + routes | None |
| API client | Single `src/api/client.js` | None |
| Mock dataset | `src/data/` mock path when `VITE_USE_API=false` | Keep; production build scan excludes mock keys |

### Express routes (46 registrations, no duplicate method+path)

See `backend/src/utils/listExpressRoutes.js` + test `28-route-duplicates.test.js`. Admin and favorites both mount at `/api` but paths differ (`/admin/export` vs `/favorites`); no shadowing found.

### Database

| Check | Finding |
|---|---|
| `herb_indication` vs `herb_indications` | Only `herb_indications` exists |
| Migrations | `001`–`016` sequential `.cjs`; no duplicate numbers |
| Unused tables | `herb_avayava` exists but no Organ data (product decision: filter disabled) |

**jscpd:** not run this session (cost/time); optional before consolidation.

### Superseded `backend/scripts/test*.js` (propose delete after Phase 1 Playwright)

Covered by `backend/tests/*.test.js`: auth, library, search, weights, herb CRUD, vocabulary, admin, favorites, account, simple search, explain, translations, password reset, upload, export, CORS, RLS. One-off scripts (`testLogin.js`, `testAdminPagesUI.js`, etc.) overlap manual Chromium notes in older `PHASE_STATUS` — **delete after Playwright lands**.

---

## Phase 0.6 script inventory (no removals yet)

**Root `package.json`:** `dev`, `dev:local`, `check:local`, `build`, `verify:api-build`, `lint`, `test`, `preview`.

**Backend `package.json`:** `start`, `dev`, `migrate*`, `import:frontend`, `scale:herbs`, `db:embedded`, `seed`, `test`, `test:cleanup`, `check:rls`, `admin:first`, `export:herbs`, `measure:search-concurrency`, `weights:reset`, `dev-users:passwords`, **`seed:dev-users:supabase-dev`**, **`staging:remove-dev-users`**, `loadtest:search`, `explain:search`, `rag:ingest`.

---

## Master prompt phase summary (0–7)

| Phase | Status | Notes |
|---|---|---|
| **0** Ground truth & cleanup | **WIRED-UNVERIFIED** | 0.1–0.3 code done; 0.4–0.5 dry runs recorded; deletions/consolidation **blocked on your approval**; Supabase dev inspection **BLOCKED** (`DEV_DB_REF`) |
| **1** E2E tests | **NOT STARTED** | Playwright + smoke + section 5 acceptance on local DB |
| **2** Admin/user pages | **WIRED-UNVERIFIED** | API wired; Playwright per role not done |
| **3** Search quality & vocabulary | **WIRED-UNVERIFIED** | Simple search tests exist; expert CSV still empty |
| **4** RAG & InfoIcon | **WIRED-UNVERIFIED** | Template/mock path tested; live LLM **BLOCKED** (no key) |
| **5** Multi-language | **WIRED-UNVERIFIED** | Mock translation tests; Sarvam **BLOCKED** |
| **6** Images, reset, first admin | **BLOCKED** | Storage/SMTP/first-admin on prod |
| **7** Security & deployment | **NOT STARTED** | No `docs/DEPLOY.md` yet; CI exists |

Labels: `NOT STARTED` | `WIRED-UNVERIFIED` | `VERIFIED` | `BLOCKED`.

---

## Historical notes (pre–Phase 0)

Older verification paragraphs below this line are retained for audit trail but may reference ports, test counts, or environments that differ from the 2026-10-24 run. Prefer the **Phase 0 evidence** section above for current truth.
