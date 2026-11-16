# Staging runbook (operator)

No secrets in this document. Use `backend/.env.example` as the variable catalog.

## Prerequisites (account access required)

| Item | Owner action |
|------|----------------|
| Staging Postgres or Supabase **staging** project | Create project; run `npm run migrate` from `backend/` with staging `DATABASE_URL` |
| Render / hosting account | Connect repo; set `rootDir: backend` per `render.yaml` |
| Frontend static host (Vercel/Netlify/etc.) | Build with `VITE_USE_API=true` and `VITE_API_BASE_URL=<staging API URL>` |
| SMTP provider | Set `SMTP_HOST`, `SMTP_FROM`, optional auth vars; verify with password-reset request |
| Supabase Storage bucket | Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`; public read on bucket or switch to signed URLs later |
| LLM / translation keys | `GEMINI_API_KEY`, `SARVAM_API_KEY`, `LLM_PROVIDER=gemini` |

## Pre-deploy checks (local or CI)

```text
cd backend && npm test          # isolated DB 127.0.0.1:54334 + API 4010
cd .. && npm test -- --run      # Vitest
npm run test:e2e                # isolated DB (15 specs)
npm run lint && npm run build
```

Against **dev** pooler (shell must not override `DATABASE_URL`):

```text
cd backend
npm start                       # uses .env
node scripts/devApplicationWorkflow.js
ACCEPTANCE_BASELINE_TIKTA_DEEPANA=55 npm run test:acceptance
```

Optional UI on dev API:

```text
E2E_DEV_WORKFLOW=1 E2E_API_URL=http://localhost:4000 DEV_USER_PASSWORD=<dev> ^
  npx playwright test -c e2e/playwright.config.js e2e/specs/dev-application-workflow.spec.js
```

Inspect gaps without values:

```text
npm run inspect:storage
npm run inspect:smtp
```

## Deploy API (Render pattern)

1. Set env vars from `.env.example` (production `NODE_ENV`, strong `JWT_SECRET`, exact `FRONTEND_ORIGIN` list).
2. Deploy; confirm `GET /api/health` → `database: ok`, `storageConfigured` / `smtpConfigured` as expected.
3. Run `devApplicationWorkflow.js` pointed at staging URL (set `PORT` or patch script base URL via env `WORKFLOW_API_BASE` if added).

## Deploy frontend

1. `VITE_API_BASE_URL=https://<staging-api>/`
2. `VITE_USE_API=true`
3. Smoke: login, simple search, herb detail, admin route 403 for clinician.

## Health and rollback

- **Liveness:** `GET /api/health` HTTP 200.
- **Rollback app:** redeploy previous Render/static build.
- **Rollback DB:** Supabase PITR or restore `pg_dump`; do not run `vocab:approved:apply` without expert CSV approval.

## Backup

- Enable Supabase PITR or scheduled `pg_dump` on staging before migrations.
- Document last verified restore date in your ops tracker (not in git).

## Vocabulary

- **657** pending rows — see `docs/VOCAB_REVIEW_REPORT.md`.
- Do not run `vocab:approved:apply` until `approved_canonical` is filled by domain experts.
