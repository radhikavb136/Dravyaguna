 # Dravyaguna-AI

 Dravyaguna-AI is a React/Vite frontend and Express/PostgreSQL API for searching and managing Ayurvedic herb data.

 ## Local development

 1. Install the frontend and backend dependencies with `npm ci` in their respective directories. Copy `.env.example` to local `.env` files; never commit secrets.
 2. For an isolated local database, run `npm run db:embedded` from `backend/` with a new data directory (PowerShell: `$env:EMBEDDED_PG_DATA_DIR='.embedded-pg-local'; $env:EMBEDDED_PG_PORT='54329'; npm run db:embedded`; POSIX: `EMBEDDED_PG_DATA_DIR=.embedded-pg-local EMBEDDED_PG_PORT=54329 npm run db:embedded`). Keep this process running. This leaves any existing `.embedded-pg` cluster untouched.
 3. In a second `backend/` terminal, set `DATABASE_URL` to `postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna` (PowerShell: `$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna'`; POSIX shell: `export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna`), then run `npm run migrate`, `npm run import:frontend`, and `npm run seed`. Run `node scripts/seedDevUsers.js` only with that local URL or a separately verified development project.
 4. In the backend terminal, keep the local `DATABASE_URL` set, set `PORT=4000`, `NODE_ENV=development`, and `FRONTEND_ORIGIN` to the four local origins documented below, then run `npm start`.
 5. In the repository root, set `VITE_USE_API=true` and `VITE_API_BASE_URL=http://localhost:4000`, then run `npm run dev:local` to use strict port 5180.

 Do not run migrations, imports, seeds, or tests against the Supabase URL in `.env` until its exact development project has been verified. `npm test` enforces `DEV_DB_REF` for Supabase pooler targets; never guess that value or point it at production. The embedded database is disposable local development/test infrastructure and must not contain irreplaceable records.

### Company dataset import

With the ignored `Dataset/herbs.xlsx` present, inspect it read-only from `backend/` with `node scripts/importRealDatasetDryRun.js`. The dry run has no database connection and reports the source row and quality-flag totals. `node scripts/importRealDataset.js` upserts herb records and relationship data, so review its target and existing values first; it requires `ALLOW_REMOTE_DATA_IMPORT=YES` for a remote or production target and refuses to overwrite an existing generated vocabulary-review file. The generated draft is separate from `backend/scripts/vocab_review.csv`. Never run the importer against production without explicit project-owner approval and a recovery plan.

The API listens on `PORT` (default 4000) and the strict local frontend script listens on port 5180. The API health check is `http://localhost:4000/api/health` and verifies PostgreSQL readiness. Ports 5173 and 4000 may be held by stale servers from another project; use `npm run check:local` to inspect health and port owners. Do not kill another project's process without identifying its owner first.

The development CORS allow-list defaults to `http://localhost:5173`, `http://localhost:5180`, `http://127.0.0.1:5173`, and `http://127.0.0.1:5180`. Set `FRONTEND_ORIGIN` as a comma-separated exact-origin list when starting the backend. Production requires an explicit non-wildcard list.

 ## Verification

 From the repository root:

 ```text
 npm test
 npm run build
 npm run verify:api-build
 ```

 From `backend/`:

 ```text
 npm test
 npm run check:rls
 ```

 Backend tests require a running API, migrated database, imported data, and local development users. CI uses a disposable PostgreSQL service and never connects to Supabase. `docs/PHASE_STATUS.md` records which environment each verification used.

## Staging deployment (Render API + Vercel frontend)

The repository includes `render.yaml` and `vercel.json` as provider configurations. They do not contain credentials and do not deploy automatically from this workspace.

1. Create a **staging-only** Supabase project and Render/Vercel services. Set backend secrets in Render's environment settings: `DATABASE_URL`, `JWT_SECRET`, and the exact Vercel origin in `FRONTEND_ORIGIN`. Set the Vercel build variables `VITE_USE_API=true` and `VITE_API_BASE_URL` to the deployed API origin. Never put secret values in this repository.
2. From a controlled release terminal, set `DATABASE_URL` to the verified staging project, then run `cd backend`, `npm ci`, `npm run migrate`, and `npm run check:rls`. Migrations run as an explicit release action, not on API boot. Review the RLS state in Supabase before sending traffic; the API uses the server connection while public Data API access has no policies.
3. Create the first admin once from `backend/` with `npm run admin:first`. It prompts for name/email and a hidden password, stores only the bcrypt hash, and refuses if an admin already exists. Do not run `seedDevUsers.js` or the dev seed against staging/production.
4. Deploy the API using the Render blueprint. Confirm Render's `/api/health` check reports both API and database healthy.
5. Deploy the frontend from the repository root using the Vercel config. The rewrite sends SPA routes to `index.html`; set build-time variables before the build. The frontend uses the API when `VITE_USE_API=true`.
6. Import only the company-approved dataset into staging from an authorized source. Run the API tests and click-through in `docs/MANUAL_CHECKLIST.md` against staging before launch.
7. For rollback, redeploy the previous application build. Database migrations are forward-only; prepare a reviewed forward fix for schema changes rather than dropping tables or reversing data changes.

The hosting accounts, staging Supabase project/connection, frontend origin, and required secrets have not been supplied in this workspace, so an actual staging deployment has not been performed. Translation, RAG, SMTP, storage, monitoring, and billing remain provider-dependent integrations; mock implementations are tracked separately.

 ## CI

 GitHub Actions runs backend migrations/import/tests against disposable PostgreSQL and runs frontend tests and the production build. See `.github/workflows/ci.yml`.

 ## Current status

 See [docs/PHASE_STATUS.md](docs/PHASE_STATUS.md), [docs/API.md](docs/API.md), and [docs/MANUAL_CHECKLIST.md](docs/MANUAL_CHECKLIST.md) for verified behavior and remaining product work.
