# Environments

This document maps where each workflow connects. Credentials never appear here—only `host:port` endpoints.

## Supabase auth vs application users

The API uses **our own JWT + bcrypt auth**, not Supabase Auth. Registered and seeded accounts live in the PostgreSQL table **`public.users`**. In the Supabase dashboard, open **Table Editor → `users`** to see them.

The dashboard page **Authentication → Users** lists **Supabase Auth** users only. That list stays empty for this project. If you register in the app but look only at Authentication → Users, it will look like “users don’t appear in Supabase” even when rows exist in `public.users`.

## Environment summary

| Environment | Purpose | Typical `host:port` | Selected by |
|---|---|---|---|
| Local isolated test DB | Automated `npm test`, CI, disposable imports | `127.0.0.1:54334` (owner machine) or `localhost:5432` (GitHub Actions service) | `DATABASE_URL` in the shell when running tests; CI sets it in `.github/workflows/ci.yml` |
| Local embedded Postgres (dev) | Manual dev when you start `npm run db:embedded` | `127.0.0.1:54329` (default) or custom `EMBEDDED_PG_PORT` | `DATABASE_URL` in `backend/.env` or your terminal |
| Supabase **dev** | Company data, manual testing (Mumbai pooler) | `*.pooler.supabase.com:5432` (session pooler; direct DB host is IPv6-only and may fail on some networks) | `DATABASE_URL` in `backend/.env` when you intentionally point dev at Supabase |
| Supabase **production** | Launch (separate project, not created in repo) | TBD | Production host env vars only—never reuse dev `DATABASE_URL` |

### What uses which database today (this workspace)

| Workflow | Database target (verified 2026-10-24) |
|---|---|
| `backend/.env` default `DATABASE_URL` | `127.0.0.1:54334` (local; requires embedded Postgres running) |
| `npm run dev` / `npm start` (backend) | Whatever `DATABASE_URL` was set when the process started—usually `backend/.env` |
| `npm test` (backend) | `DATABASE_URL` from environment; refuses Supabase pooler unless `DEV_DB_REF` matches the project ref in the URL |
| `npm run migrate`, `npm run seed`, `npm run import:frontend` | Same as active `DATABASE_URL` in the shell |
| `npm run check:local` | Reads `backend/.env` for counts/RLS; asks the **running** API at port 4000 for `databaseEndpoint` on `/api/health` |
| GitHub Actions `backend` job | `localhost:5432` service container `dravyaguna_test` |
| Frontend `npm run dev:local` | No database; talks to API via `VITE_API_BASE_URL` (default `http://localhost:4000`) |

`DEV_DB_REF` is **not set** in the current workspace, so remote Supabase inspection and `npm run seed:dev-users:supabase-dev` are blocked until you add the dev project ref to `backend/.env`.

## Guard variables

| Variable | Role |
|---|---|
| `DATABASE_URL` | PostgreSQL connection for backend, migrations, seeds, tests |
| `DEV_DB_REF` | Supabase dev project ref (must match pooler username `postgres.<ref>`); required for tests against dev pooler and for `seed:dev-users:supabase-dev` |
| `PROD_DB_REF` | Blocks tests/seeds when URL matches production |
| `NODE_ENV` | `production` blocks dev-user seed/remove scripts |
| `EMBEDDED_PG_DATA_DIR`, `EMBEDDED_PG_PORT` | Local embedded cluster location and port (`npm run db:embedded`) |

## Local diagnostics

From the repository root:

```text
npm run check:local
```

When the API is healthy, `/api/health` includes `databaseEndpoint` (`host:port` only). The script also prints user/herb counts and public-table RLS state using `backend/.env`’s `DATABASE_URL`.

## Read-only Supabase dev inspection (SQL)

If `DEV_DB_REF` and a dev `DATABASE_URL` are not available in the agent environment, run this in the Supabase SQL editor (read-only aggregates):

```sql
SELECT role, COUNT(*) AS users FROM users GROUP BY role ORDER BY role;
SELECT status, COUNT(*) AS herbs FROM herbs GROUP BY status ORDER BY status;
SELECT 'rasa_terms' AS tbl, COUNT(*) FROM rasa_terms
UNION ALL SELECT 'guna_terms', COUNT(*) FROM guna_terms
UNION ALL SELECT 'karma_terms', COUNT(*) FROM karma_terms
UNION ALL SELECT 'indication_terms', COUNT(*) FROM indication_terms
UNION ALL SELECT 'virya_terms', COUNT(*) FROM virya_terms
UNION ALL SELECT 'vipaka_terms', COUNT(*) FROM vipaka_terms
UNION ALL SELECT 'dhatu_terms', COUNT(*) FROM dhatu_terms
UNION ALL SELECT 'mala_terms', COUNT(*) FROM mala_terms
UNION ALL SELECT 'srotas_terms', COUNT(*) FROM srotas_terms;
SELECT COUNT(*) AS audit_rows FROM audit_log;
SELECT COUNT(*) AS mala_rows FROM herb_mala;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected herb visibility on dev after a correct company import: **134** `reviewed`, **42** `draft` (176 total). Mala junction rows from the original import: **228**.

## Dev user scripts (Supabase dev only)

From `backend/`:

```text
npm run seed:dev-users:supabase-dev -- --confirm
npm run staging:remove-dev-users -- --confirm
```

Requires non-production `NODE_ENV`, `DEV_DB_REF` matching the pooler URL, and passwords from `DEV_USER_PASSWORD` (≥10 characters, never logged). Dev users must not exist in production.
