# Dravyaguna release status

Updated **2026-10-24** — Phase 2 on branch `phase-2-admin-pages`. Stopped after Phase 2 implementation (no Supabase writes).

## Environment check (before Phase 2 edits)

| Check | Result |
|---|---|
| Branch | `phase-2-admin-pages` (from `phase-0-ground-truth`) |
| `backend/.env` database | `127.0.0.1:54334` (isolated local) |
| `DEV_DB_REF` | **unset** — Supabase dev inspection/writes **BLOCKED** per guard rules |
| Intended manual target | Supabase dev (pooler) once `DEV_DB_REF` matches project ref |

**No** seed/delete/import/schema changes were made. **No** Supabase connections.

## Phase 2 evidence (2026-10-24)

| Page / area | Status | Notes |
|---|---|---|
| Scoring Configuration | WIRED-UNVERIFIED | Avayava row disabled; live Tikta+Deepana preview via API after load/save; Playwright **BLOCKED** (`E2E_RUN` not set) |
| Manage Herbs | WIRED-UNVERIFIED | Server pagination + `q` + status; role actions retained; Vitest adapter for `q` |
| Add/Edit Herb | WIRED-UNVERIFIED | Verified→reviewed alert on edit; create stays draft; Playwright **BLOCKED** |
| Vocabulary (Karma/Indication) | WIRED-UNVERIFIED | `custom` badge on `is_custom` terms |
| Audit Log | WIRED-UNVERIFIED | Already API-backed; Playwright **BLOCKED** |
| Search Analytics | WIRED-UNVERIFIED | Already API-backed; Playwright **BLOCKED** |
| User & Role Management | WIRED-UNVERIFIED | **Create user** UI + `createUser` API; Playwright **BLOCKED** |
| Compare / Favorites / saved searches | WIRED-UNVERIFIED | API-backed (prior work); Playwright **BLOCKED** |

### Commands run

**Frontend** (`npm test`):

```text
Test Files  10 passed (10)
Tests       37 passed (37)
```

**Backend** (`DATABASE_URL=127.0.0.1:54334`, `API_BASE_URL=http://127.0.0.1:4000`, `DISABLE_RATE_LIMIT=true` on API process):

```text
30 passed, 0 failed, 30 total
```

(includes new `GET /api/herbs?q=HERB_REC_0001` assertion in `02-library.test.js`)

**Lint:** `npm run lint` → 0 errors, 27 warnings

**Build:** `npm run build` → success

**API bundle:** `npm run verify:api-build` → PASS (6 mock keys excluded)

**Playwright:** `npm run test:e2e` → **2 skipped** (requires `E2E_RUN=true`, running API on 4000, frontend on 5180, `DEV_USER_PASSWORD`)

### API changes (Phase 2)

- `GET /api/herbs?q=` — name/code search (documented in `docs/API.md`)
- Frontend `apiClient` attaches `status` and Zod `details` on errors (401 still clears token)

### Playwright

- Config: `e2e/playwright.config.js`, specs: `e2e/specs/phase2-admin.spec.js`
- **BLOCKED** in this session: not executed with `E2E_RUN=true` (no browser run against live stack)

### Remaining blockers

1. **Supabase dev manual testing:** set `DEV_DB_REF` + pooler `DATABASE_URL`; restart backend; do not point tests at Supabase without guard alignment.
2. **Playwright VERIFIED:** run `E2E_RUN=true DEV_USER_PASSWORD=... npm run test:e2e` with API + frontend up.
3. **Phase 1:** full Playwright matrix per page/role; `21-rag-knowledge` draft fixture on fresh DB.

---

## Phase 0 summary (unchanged)

See git history on `phase-0-ground-truth` (`361e0cf`) for environment map, `check:local`, dev-user scripts, route-duplicate test.

Labels: `NOT STARTED` | `WIRED-UNVERIFIED` | `VERIFIED` | `BLOCKED`.
