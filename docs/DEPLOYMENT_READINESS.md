# Deployment and launch readiness

Updated 2026-10-24. This document describes what is **verified locally** versus what still requires hosting credentials, a dedicated production database, and operational sign-off. Passing local/CI tests does **not** mean production-ready.

## Verified locally (automated)

| Area | Evidence |
|------|----------|
| API health | `GET /api/health` — database probe, rate-limit flags |
| Auth + roles | Backend integration tests `01-auth`, `08-admin`, E2E role gates |
| Rate limiting | Login, password reset (`17-password-reset`), explain (`15-explain`), search translation (`25-search-translation`) |
| CORS | `26-cors.test.js` against configured `FRONTEND_ORIGIN` |
| Log redaction | Pino redacts `authorization` and `cookie` headers (`backend/src/app.js`) |
| SQL parameterization | `35-security-input.test.js` — malicious strings do not error the API |
| CI database | `.github/workflows/ci.yml` — Postgres 16 service, migrate + seed, API on port 4000, `npm test` |

## Staging / production blockers

| Requirement | Status | Notes |
|-------------|--------|-------|
| Production `DATABASE_URL` | **BLOCKED** | Separate project; never use dev pooler for prod |
| `FRONTEND_ORIGIN` (exact list) | **BLOCKED** | Required in `NODE_ENV=production`; no wildcards |
| `JWT_SECRET` | **BLOCKED** | Strong unique secret per environment |
| SMTP (password reset email) | **BLOCKED** | Nodemailer wired (`emailDeliveryService.js`). Required: **`SMTP_HOST`**, **`SMTP_FROM`**; optional **`SMTP_PORT`** (default 587), **`SMTP_USER`**, **`SMTP_PASSWORD`**, **`PASSWORD_RESET_PUBLIC_PATH`**. Inspect: `npm run inspect:smtp` in `backend/`. Live send **not verified** without provider credentials. |
| Supabase Storage (herb images) | **BLOCKED** | Upload route + magic-byte validation **VERIFIED** in tests (`18-upload`, `40-storage-service`). Required: **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`SUPABASE_STORAGE_BUCKET`**. Inspect: `npm run inspect:storage`. Live upload **not verified** (no credentials in `.env`). |
| LLM (Gemini) | **VERIFIED** (live smoke) | `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`; integration tests use mock when `NODE_ENV=test`. `RUN_LIVE_PROVIDER_SMOKE=1 npm run smoke:live-providers` → **ok** when API demand allows. |
| Translation (Sarvam) | **VERIFIED** (live smoke) | `SARVAM_API_KEY`; search **hi-IN** / **mr-IN**; herb fields hi/mr/sa. Live smoke **ok**. |
| Hosting (Render/Vercel/etc.) | **BLOCKED** | Config templates may exist; no staging deploy run in-repo |
| Monitoring / alerting | **BLOCKED** | No APM or error tracking wired |
| Backup / restore drill | **BLOCKED** | Use Supabase PITR or `pg_dump` on approved schedule; restore not exercised here |
| RLS policies on Supabase | **WIRED-UNVERIFIED** | Migration 011 enables RLS without policies on local test DB |

## Recommended deploy sequence (when credentials exist)

1. Provision **staging** Postgres (or Supabase staging project) and run migrations (`npm run migrate` in `backend/`).
2. Set env from `backend/.env.example` (never commit values): `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, optional LLM/translation/SMTP/storage vars.
3. Start API (`npm start`); confirm `GET /api/health` → `database: ok`.
4. Build frontend with `VITE_API_BASE_URL` pointing at staging API; deploy static assets.
5. Run smoke: register (if allowed), login, simple search, admin export (admin role).
6. Run **`ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55`** only on the **approved dev dataset**, not staging, unless staging is explicitly aligned.
7. Schedule backups; document rollback (redeploy previous artifact + DB restore procedure).

## Health checks

- **Liveness:** `GET /api/health` → HTTP 200, `status: ok`.
- **Readiness:** same endpoint; `database: ok` required before serving traffic.

## Rollback

- **Application:** redeploy previous API and frontend build artifacts.
- **Database:** restore from last verified backup; migrations are additive only—avoid destructive DDL in production.

## Local demonstration readiness

**Ready for local demo** when:

- Embedded/local Postgres on `127.0.0.1:54334` (or CI Postgres) is migrated and seeded.
- API on port **4000** or **4010**; frontend `npm run dev:local` with matching `VITE_API_BASE_URL`.
- Full suites: frontend Vitest, backend integration, Playwright (local DB guard).

**Not ready for production** until staging blockers above are resolved and a backup/restore drill is documented by the operator.
