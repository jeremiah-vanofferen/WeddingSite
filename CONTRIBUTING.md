# Contributing

Thanks for contributing to this wedding site project.

This repository contains:
- React 18 + Vite frontend (`src/`)
- Node.js 22 + Express backend (modular routes under `backend/routes/`)
- PostgreSQL 16 database
- Docker Compose orchestration for local development

## Development Setup

### Prerequisites
- Docker Desktop
- Docker Compose

### Start the full stack
```bash
docker-compose up --build
```

App endpoints in local Docker:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Postgres: `localhost:5432`

### Environment variables
Configuration is driven by `.env` (do not commit this file).

All variables have defaults in `docker-compose.yml` — an `.env` file is not required to start locally. Override any value in `.env` to customize.

Common vars to override:
- `DATABASE_URL`
- `JWT_SECRET`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Optional vars include `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `GMAIL_USER`, `GMAIL_PASS`, `VITE_API_URL`, `CORS_ORIGIN`.

## Project Conventions

### Frontend (`src/**`)
- Always use `API_BASE_URL` from `src/utils/api.js` for API URLs.
- Do not hardcode `/api/...` paths in components.
- Check `response.ok` before `response.json()` when handling fetch responses directly.
- Prefer shared helpers for request logic and settings/public data behavior.
- Public endpoints require an anonymous JWT in non-test environments; for direct public `fetch` calls use `getPublicAuthHeaders()` from `src/utils/http.js`.
- Keep components functional with React hooks.
- Keep styling in CSS files (avoid adding new inline style blocks when a class is appropriate).
- Keep admin modal behavior consistent: on save failure show error and keep modal open.

### Backend (`backend/**`)
- Keep backend code CommonJS (`require`/`module.exports`).
- Use parameterized SQL queries only (`$1`, `$2`, ...).
- Never interpolate user input into SQL strings.
- Return JSON error shape as:
```json
{ "error": "Human-readable message" }
```
- Keep route behavior consistent with existing API conventions and auth middleware usage.

### Settings and booleans
- Settings are stored in Postgres as string values.
- Boolean keys are stored as `'true'` / `'false'` and must be normalized when read.

## Testing and Linting

Run checks in Docker:

```bash
# Run all tests (no running stack required)
./test-docker.sh

# Run only frontend or backend
./test-docker.sh frontend
./test-docker.sh backend
```

VS Code tasks are also available:
- `Lint: Backend (ESLint)`
- `Lint: Frontend (ESLint)`
- `Test: Backend (Jest)`
- `Test: Frontend (Vitest)`
- `Lint: All`
- `Test: All`

### Test patterns
- Backend tests mock external modules before requiring `backend/server.js`.
- Frontend tests should mock `fetch` responses with `ok` and `json()` to match runtime behavior.
- For lazy-loaded modal assertions, prefer async queries like `findBy...`.

## Pull Request Guidelines

Before opening a PR:
- Keep changes focused and scoped to one concern where possible.
- Run lint and tests for affected areas (ideally all).
- Update docs when behavior, endpoints, or workflows change.
- Avoid unrelated refactors in the same PR.

PR description should include:
- What changed
- Why it changed
- How it was tested
- Any follow-up tasks

## Commit Guidance

- Use clear, action-oriented commit messages.
- Prefer small, reviewable commits.
- Do not commit secrets or `.env` files.

## Contribution License

By contributing to this repository, you agree that your contributions are licensed under Apache License 2.0.

## Database and Seed Notes

`init.sh` runs only when the `postgres_data` volume does not yet exist — restarts and `docker compose down` (without `-v`) do not re-trigger it.

| Scenario | Seeding runs? |
|---|---|
| Fresh install / first `docker compose up` | ✅ Yes |
| `docker compose down -v` then `up` | ✅ Yes |
| `docker compose down` then `up` | ❌ No |
| `docker compose restart` | ❌ No |

To re-seed from scratch:
```bash
docker-compose down -v
docker-compose up --build
```

> This wipes all data. Export guests from the admin panel first if needed.

CSV files in `seed-uploads/` must quote any field that contains a comma (e.g. addresses), otherwise the column count will be off and the import will be skipped silently.

## Need Help?

If you are unsure about a pattern, follow existing implementations in:
- `src/pages/Admin.jsx`
- `src/utils/http.js`
- `src/utils/publicData.js`
- `src/utils/settings.js`
- `backend/routes/private/guests.js`   ← guest CRUD patterns
- `backend/routes/public/rsvp.js`      ← public endpoint patterns
