# Dravyaguna standing rules

Before changing code, read `docs/BUILD_PROMPT.md`, then the living status and issue/API/manual docs requested by the user. The `DECISIONS THAT OVERRIDE` section in `docs/BUILD_PROMPT.md` takes precedence over later sections in that document. Inspect real code and existing conventions before editing.

- Use only these status labels: `NOT STARTED`, `WIRED-UNVERIFIED`, `VERIFIED`, `BLOCKED`. A feature is `VERIFIED` only with a passing automated test; state the command and output. A row uses the weakest status among its parts. Never write “complete” while a required test fails.
- Never print, log, or commit `.env`, tokens, or keys. Never push to `main`, force-push, or rewrite history.
- Migrations are additive/ALTER-only. Never add `DROP TABLE` to a migration; preserve existing database data.
- Run tests only against the local test database. Keep the existing production safety guard unchanged. Never weaken production rate limits.
- Do not restyle or restructure the frontend. Keep changes thin, preserve `VITE_USE_API`, and use existing conventions.
- Never invent Ayurvedic content. Any unapproved draft content must be marked `draft` for expert review.
- Preserve unrelated working-tree changes. Stage and commit only files belonging to the current approved item; commit per item when requested.
- Update `docs/PHASE_STATUS.md` after each item with exact commands and outputs, verified scope, blockers, and the next task. Keep `docs/KNOWN_ISSUES.md` accurate.
- Do not mark a browser-only claim as `VERIFIED`. If browser automation is unavailable, say what could not be verified.
- Use mock providers when external keys are not supplied. Mark live integrations `BLOCKED` until their credentials/services are provided.
