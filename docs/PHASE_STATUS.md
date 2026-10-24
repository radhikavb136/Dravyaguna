# Dravyaguna release status

Updated **2026-10-24** — Phase 1 acceptance hardening on branch `phase-2-admin-pages`. Spec: user master prompt (Phases 0–8); `docs/BUILD_PROMPT.md` **missing** (see `AGENTS.md`).

## Environment (read-only inspection)

| Check | Result |
|---|---|
| Branch | `phase-2-admin-pages` · prior commit `0f29cda` |
| `DATABASE_URL` endpoint | `127.0.0.1:54334` (local embedded Postgres) |
| `DEV_DB_REF` | **unset** · pooler URL in `.env`: **no** |
| Supabase dev verification | **BLOCKED** — cannot confirm 134/42 herb split or remote registration without pooler + ref |
| Users (`public.users`) | **7** |
| Herbs by status | draft **1**, reviewed **175**, verified **2**, archived **6** |
| RLS | all `public` tables enabled (`npm run check:local`) |
| API health | `databaseEndpoint` **127.0.0.1:54334** when API running on **4000** |

**Your action for Supabase dev today:** In `backend/.env`, set session-pooler `DATABASE_URL` and `DEV_DB_REF` to the **exact** dev project ref (`postgres.<ref>` in the username). Restart API. Run read-only SQL from `docs/ENVIRONMENTS.md` before any writes. Then `npm run seed:dev-users:supabase-dev -- --confirm` only if dev users are missing. Never point at production.

## Phase 0–8 reconciliation (weakest status per phase)

| Phase | Status | Evidence / gap |
|---|---|---|
| **0** Ground truth, guards, audits | **VERIFIED** (local) | `361e0cf`: `docs/ENVIRONMENTS.md`, `check:local`, `seedDevUsers` guards, route-duplicate test `28-route-duplicates.test.js`. Supabase inspection **BLOCKED** (no `DEV_DB_REF`). Clutter/deletion audits documented; no deletions without approval. |
| **1** E2E/smoke, dataset, acceptance numbers | **VERIFIED** (local logic) · **BLOCKED** (Supabase + fixed 55 baseline) | Backend **`npm test` → 31 passed** incl. `29-acceptance-search-visibility.test.js` (baseline-relative N→N+1→N). `01-auth.test.js` login-after-register. Playwright **9/9** retained. Optional `ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55` on approved dev DB only. Local DB still **175 reviewed** (not 134/42). **No** Supabase registration persistence tested. |
| **2** Admin/user pages, permissions, Playwright | **VERIFIED** (core) | E2E: scoring, manage/add herb, vocabulary, audit, analytics, users, favorites, compare, 401/403, verified→reviewed. Gaps: deep form validation, user-create UI, vocabulary CRUD UI, scoring save persistence (see Phase 2 notes below). |
| **3** Search quality, vocabulary, export, performance | **WIRED-UNVERIFIED** | Deterministic weighted search in `buildSearchQuery.js`; tests `03-search`, `12-simple-search-*`, `20-search-query-shape`. Approved `vocab_review.csv` / indication mapping **not applied** (empty indication vocabulary per `KNOWN_ISSUES`). Export **VERIFIED** in `19-export.test.js`. Load/Supabase perf **BLOCKED**. |
| **4** Grounded RAG + InfoIcon | **WIRED-UNVERIFIED** | `explainService.js`, `ragKnowledgeService.js` (Postgres **FTS**, not pgvector embeddings), `InfoIcon.jsx` + tests. `21-rag-knowledge.test.js`, `15-explain.test.js` **pass**. Live `LLM_API_KEY` **BLOCKED**; no classical reference corpus — do not fabricate citations. |
| **5** EN/HI/MR/SA translation | **WIRED-UNVERIFIED** | `16-translations.test.js`, `25-search-translation.test.js` pass with mocks. Live Sarvam/Google/Azure keys **BLOCKED**. Sanskrit UI partial per `KNOWN_ISSUES`. |
| **6** Storage, password reset, first admin | **WIRED-UNVERIFIED** | `17-password-reset.test.js`, `18-upload.test.js`, `14-first-admin-safe-prompt.test.js` pass (stub SMTP/storage). Real SMTP + Supabase Storage bucket **BLOCKED**. |
| **7** Security, CI, deploy, backups | **WIRED-UNVERIFIED** | `.github/workflows/ci.yml` (Postgres service + backend/frontend tests). RLS enabled locally `12-rls.test.js`. Staging deploy, monitoring, backup/restore **BLOCKED** (no hosting/secrets). |
| **8** Company-pitch UX | **NOT STARTED** | No code hits for herb-name search UX, “Why not this herb,” plain-language toggle, caution flags, similar-Karma hints, verification badges on cards, or evidence-based improvement suggestions (repo search 2026-10-24). |

Status labels only: `NOT STARTED` | `WIRED-UNVERIFIED` | `VERIFIED` | `BLOCKED`.

## Test evidence (2026-10-24, local)

| Command | Result |
|---|---|
| `npm test` (repo root) | **37 passed**, 0 failed |
| `npm test` (`backend/`, API on 4000 via `start:e2e`) | **31 passed**, 0 failed (2026-10-24) |
| `npm run test:acceptance` (`backend/`) | **PASS** baseline-relative |
| `npm run test:e2e` (retained) | **9 passed**, 0 failed, 0 skipped |

### Playwright (retained — do not rerun unless regressing)

```text
DEV_USER_PASSWORD=<≥10 chars>  E2E_BROWSER_CHANNEL=chrome  npm run test:e2e
→ 9 passed, 0 failed, 0 skipped
```

Spec: `e2e/specs/phase2-pages.spec.js`. Web servers: `backend/scripts/startE2eApi.js` + `npm run dev:local`.

## Code changes this session

- `backend/tests/21-rag-knowledge.test.js` — insert `zz_test_rag_draft_*` when no draft herb exists.
- `backend/tests/acceptance-search-visibility.js` — use `DEV_USER_PASSWORD`; safer login errors.
- `backend/src/routes/auth.routes.js` — honor `DISABLE_RATE_LIMIT=true` for login limiter (E2E/test stacks).
- Phase 2 E2E stack + `AddHerb.jsx` verified-save demotion (prior verification).

## Next implementation order (master prompt)

1. **BLOCKED:** Supabase dev `DEV_DB_REF` + pooler URL (you) → registration/login against remote DB, read-only counts vs 134/42.
2. **Phase 1:** Align local acceptance DB **only with your approval** (import/reviewed split) or run acceptance against Supabase dev once connected.
3. **Phase 2:** Close remaining E2E gaps (user create, vocabulary CRUD UI).
4. **Phase 3:** Apply approved vocabulary CSV; re-verify search acceptance numbers.
5. **Phases 4–6:** Live provider keys + storage/SMTP when supplied.
6. **Phase 8:** Implement pitch features per master prompt once Phases 1–3 data path is stable.

---

## Phase 2 detail (E2E VERIFIED scope)

| Area | Status |
|---|---|
| Scoring, Manage Herbs, Add/Edit, Vocabulary, Audit, Analytics, Users, Favorites, Compare | **VERIFIED** (E2E page load + role gates) |
| Auth 401 redirect, API 401, 403 verify, 400 dhatu, verified→reviewed | **VERIFIED** (E2E + API tests) |

Labels: `NOT STARTED` | `WIRED-UNVERIFIED` | `VERIFIED` | `BLOCKED`.
