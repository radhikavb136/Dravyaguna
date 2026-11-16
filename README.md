 # Dravyaguna-AI

 Dravyaguna-AI is a React/Vite frontend and Express/PostgreSQL API for searching and managing Ayurvedic herb data.

 ## Local development

 1. Install the frontend and backend dependencies with `npm ci` in their respective directories. Copy `.env.example` to local `.env` files; never commit secrets.
 2. For an isolated local database, run `npm run db:embedded` from `backend/` with a new data directory (PowerShell: `$env:EMBEDDED_PG_DATA_DIR='.embedded-pg-local'; $env:EMBEDDED_PG_PORT='54329'; npm run db:embedded`; POSIX: `EMBEDDED_PG_DATA_DIR=.embedded-pg-local EMBEDDED_PG_PORT=54329 npm run db:embedded`). Keep this process running. This leaves any existing `.embedded-pg` cluster untouched.
 3. In a second `backend/` terminal, set `DATABASE_URL` to `postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna` (PowerShell: `$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna'`; POSIX shell: `export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/dravyaguna`), then run `npm run migrate`, `npm run import:frontend`, and `npm run seed`. Run `node scripts/seedDevUsers.js` only with that local URL or a separately verified development project.
 4. In the backend terminal, keep the local `DATABASE_URL` set, set `PORT=4000`, `NODE_ENV=development`, and `FRONTEND_ORIGIN` to the four local origins documented below, then run `npm start`.
 5. In the repository root, set `VITE_USE_API=true` and `VITE_API_BASE_URL=http://localhost:4000`, then run `npm run dev:local` to use strict port 5180.

 Do not run migrations, imports, seeds, or tests against the Supabase URL in `.env` until its exact development project has been verified. `npm test` enforces `DEV_DB_REF` for Supabase pooler targets; never guess that value or point it at production. The embedded database is disposable local development/test infrastructure and must not contain irreplaceable records.


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
