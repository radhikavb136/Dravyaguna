# Local sponsor demo (no hosting)

## Which backend command?

| Goal | Command | Port | Database |
|------|---------|------|----------|
| **Sponsor demo** (isolated local stack) | `cd backend` → `npm run start:demo` | **4010** | `127.0.0.1:54334` / `dravyaguna` |
| **Ordinary development** | `cd backend` → `npm run dev` | **4000** (from `backend/.env` `PORT`) | `DATABASE_URL` in `backend/.env` |
| **Playwright / integration tests** | `npm run start:e2e` | **4010** (or `PORT` env) | local **54334** when configured |

The frontend for the demo must use `VITE_API_BASE_URL=http://127.0.0.1:4010` (repo-root `.env`). Restart Vite after changing it.

`npm run dev` in **backend** does not use port 4010; it uses `PORT=4000` unless you override `PORT` in the shell. If the UI points at 4010 but you only started `npm run dev`, notifications and other features will hit the wrong API or database.

## Start the stack

1. **PostgreSQL** (embedded, port 54334):

```powershell
cd backend
$env:EMBEDDED_PG_PORT='54334'
node scripts/startEmbeddedPostgres.js
```

2. **Migrations and dataset** (first time or empty DB):

```powershell
cd backend
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna'
npm run migrate
node scripts/importFromFrontendDataset.js --fresh
node scripts/seedDevUsers.js
npm run seed
```

3. **API** (port 4010, local DB):

```powershell
cd backend
$env:SPONSOR_DEMO_DISABLE_RATE_LIMIT='true'   # optional
npm run start:demo
```

This runs `scripts/startSponsorDemoApi.js`: port **4010**, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna`, JWT and other secrets still from `backend/.env`.

**Migrations** (including `020_user_notifications` for the notification bell) must be applied against **54334**, not your remote `DATABASE_URL`:

```powershell
cd backend
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna'
npm run migrate
```

Verify: `node scripts/checkMigrationsLocal.js` (with the same `DATABASE_URL`).

Alternative (test-style API, same port/DB): `node scripts/startE2eApi.js` with `PORT=4010` and `DATABASE_URL` set as above.

4. **Frontend** (port 5180):

```powershell
cd ..   # repo root (Dravyaguna/Dravyaguna)
# Set in shell or in repo-root `.env` (must match API port 4010 for this stack):
$env:VITE_API_BASE_URL='http://127.0.0.1:4010'
$env:VITE_USE_API='true'
npm run dev:local
```

After changing `.env`, restart the Vite dev server so `VITE_API_BASE_URL` is picked up.

Open **http://localhost:5180**.

## Local admin login

Seeded dev users (password from `DEV_USER_PASSWORD` in `backend/.env`, default `Dev1234567`):

| Email | Role |
|--------|------|
| `dev-admin@test.com` | admin |
| `dev-editor@test.com` | editor |
| `dev-expert@test.com` | domain_expert |
| `dev-clinician@test.com` | clinician |

Re-seed safely (local DB only — script refuses non-localhost URLs):

```powershell
cd backend
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54334/dravyaguna'
$env:DEV_USER_PASSWORD='YourChosenPassword'
node scripts/seedDevUsers.js
```

**Self-registration** always creates a **clinician** account; admin/reviewer roles are assigned only by an existing administrator in User & role management.

## Password reset emails

Reset links use the first matching origin on port **5180** when `FRONTEND_ORIGIN` lists local dev URLs. Ensure `FRONTEND_ORIGIN` includes `http://localhost:5180` when running the API.

## Dataset

- **Database** is the live source of truth for herbs, search, and CSV/XLSX export.
- Re-import with `--fresh` **only** when you intend to replace all herb rows (not on normal app startup).
- Baseline vocabulary without wiping herbs: `node scripts/ensureBaselineVocabulary.js`

## Reference workbook

Place `herbs.xlsx` (176 herbs) in the project when using `importRealDataset.js`; the default dev path uses the frontend JS dataset via `importFromFrontendDataset.js`.
