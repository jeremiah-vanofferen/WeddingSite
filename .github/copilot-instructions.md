# Copilot Instructions

This is a full-stack wedding website: a **React 18 / Vite** frontend, a **Node.js 22 / Express** backend API, and a **PostgreSQL 16** database, all orchestrated with **Docker Compose**. The Node.js runtime is **22.x** (not 20.x) on **Alpine Linux** (not Ubuntu).

---

## Architecture Overview

```
Browser
  └── React SPA (port 3000, served by Vite dev server or static)
        └── /api/* proxied → Express API (port 5000)
              └── PostgreSQL 16 (port 5432)
```

- All `/api` calls from the frontend go through **Vite's dev-server proxy** (`vite.config.js`) to `http://backend:5000`. In production/Docker, the same proxy handles routing.
- `API_BASE_URL` in `src/utils/api.js` defaults to `/api` (same-origin). Override with `VITE_API_URL` env var only when the backend is on a different origin.
- The backend is **CommonJS** (`require`/`module.exports`). The frontend is **ES modules** (`import`/`export`).

---

## Key Files & Responsibilities

| Path | Purpose |
|---|---|
| `backend/server.js` | Single-file Express app — all routes, middleware, DB queries |
| `src/utils/api.js` | `API_BASE_URL` constant — always import this for fetch URLs |
| `src/utils/constants.js` | `DEFAULT_SETTINGS` — source of truth for settings defaults |
| `src/AuthContext.jsx` | JWT auth context — `useAuth()` returns `{ isLoggedIn, login, logout, adminName, loading }` |
| `src/App.jsx` | Root router, settings fetch, CSS variable injection, theme class on `<body>` |
| `src/pages/Admin.jsx` | Admin dashboard — lazy-loads all modals; uses `requestJson()` helper for saves |
| `init.sh` | Postgres init script — runs **once** on first volume creation; seeds admin user and default settings |
| `.github/workflows/` | GitHub Actions CI — `frontend-ci.yml` and `backend-ci.yml` |

---

## Database

- **PostgreSQL 16** accessed via the `pg` npm package (`Pool`).
- All queries use **parameterized statements** (`$1, $2, …`). Never interpolate user input into SQL strings.
- Tables: `guests`, `admin_users`, `messages`, `settings`, `schedule`.
- `settings` is a key/value store (`key TEXT PRIMARY KEY, value TEXT`). Boolean settings are stored as the strings `'true'`/`'false'` and must be coerced when reading.
- `init.sh` seeds the DB once on first start. To re-seed: `docker-compose down -v && docker-compose up --build`.

### Settings boolean coercion pattern
```js
// Backend: normalize before sending to client
const BOOL_KEYS = ['showCountdown', 'allowRsvp'];
const value = BOOL_KEYS.includes(key) ? raw === 'true' : raw;

// Frontend: handle both forms defensively
showCountdown: data.showCountdown === true || data.showCountdown === 'true'
```

---

## Authentication

- Admin login: `POST /api/auth/login` → returns a **JWT** (24 h expiry, signed with `JWT_SECRET`).
- Token stored in `localStorage` as `authToken`.
- Protected routes require `Authorization: Bearer <token>` header — use the `getAuthHeaders()` helper in `Admin.jsx`.
- Backend middleware: `authenticateToken` — returns 401 (no token) or 403 (invalid/expired).
- `JWT_SECRET` is **required** at startup; the process exits if missing.

---

## API Conventions

- All routes prefixed `/api/`.
- Success responses: `2xx` with JSON body.
- Error responses: `{ error: "Human-readable message" }` with appropriate status code.
- Public endpoints (no auth): `GET /api/public/settings`, `GET /api/schedule`, `POST /api/rsvp`, `POST /api/messages`, `GET /api/health`.
- Admin endpoints: everything else — all require `authenticateToken` middleware.
- Rate limiting: general API at 100 req/15 min; stricter (20 req/15 min) on `/api/auth/login`, `/api/rsvp`, `/api/messages`.

### RSVP guest-count rules
- `rsvp: 'yes'` → `guests` must be ≥ 1.
- `rsvp: 'no'` → `guests` may be 0.
- `guests` must be a non-negative integer; `Number.parseInt(guests, 10)` is used.

---

## Frontend Conventions

- **Always** import `API_BASE_URL` from `src/utils/api.js` for fetch URLs — never hardcode `/api/...` strings directly.
- **Always** check `response.ok` before calling `.json()`. Use the `requestJson(url, options, fallbackError)` helper in `Admin.jsx` as a model for save operations.
- Admin modal saves: show error in `saveError` state and keep modal open on failure; close only on success.
- Components use functional React with hooks only — no class components.
- CSS is scoped per component/page (e.g., `Admin.css`, `LoginModal.css`, `pages.css`).
- Theme and CSS variables are applied to `document.documentElement` and a class on `document.body` in `App.jsx`; do not set them elsewhere.
- `DEFAULT_SETTINGS` from `src/utils/constants.js` is the authoritative defaults object — merge on top of it, never replace.
- Admin modals are **lazy-loaded** via `React.lazy` + `<Suspense fallback={null}>` in `Admin.jsx`.

---

## Testing

### Frontend — Vitest + React Testing Library
- Test files: `src/__tests__/*.test.jsx`
- Runner: `npx vitest run` (Docker) or `npm test` (local)
- Setup file: `src/setupTests.js` (imports `@testing-library/jest-dom`)
- Mock `global.fetch` in `beforeEach`; always return `{ ok: true, json: () => Promise.resolve(...) }`.
- Mock child components and context with `vi.mock()`.
- Use `await screen.findByTestId(...)` (not `getByTestId`) after actions that open lazy-loaded modals.
- Suppress expected `console.error`/`console.warn` in tests that intentionally trigger error paths.

### Backend — Jest + Supertest
- Test files: `backend/__tests__/*.test.js`
- Runner: `jest --runInBand` (serial — required due to shared mock state)
- Mock `pg`, `bcryptjs`, `jsonwebtoken`, `nodemailer`, `dotenv` **before** `require('../server')`.
- Capture pool: `const pool = Pool.mock.results[0].value;`
- Use `pool.query.mockResolvedValueOnce(...)` per test; call `jest.resetAllMocks()` in `beforeEach`.
- Silence expected console output in `beforeEach` with `jest.spyOn(console, 'error').mockImplementation(() => {})`.

### Running tests & lint (Docker)
```bash
docker exec weddingsite-backend-1 npm test
docker exec weddingsite-wedding-app-1 npx vitest run
docker exec weddingsite-backend-1 npm run lint
docker exec weddingsite-wedding-app-1 npm run lint
```

---

## Linting

- **Frontend**: ESLint 9 flat config (`eslint.config.js`), covers `src/**/*.{js,jsx}`. Enforces `react/prop-types`, hooks rules, `eqeqeq`, no-unused-vars (warn), no-console (warn, allows `warn`/`error`).
- **Backend**: ESLint 9 flat config (`backend/eslint.config.js`), covers `server.js` only. CommonJS globals declared. Same `eqeqeq` and no-unused-vars rules.

---

## CI (GitHub Actions)

- `frontend-ci.yml`: triggers on changes to `src/**`, `public/**`, config files. Steps: checkout → Node 22 → `npm ci` → lint → test.
- `backend-ci.yml`: triggers on changes to `backend/**`. Steps: checkout → Node 22 → `npm ci` (in `backend/`) → lint → test.
- Concurrency: cancel-in-progress for same branch.

---

## Environment Variables

| Variable | Where used | Required |
|---|---|---|
| `DATABASE_URL` | Backend (`pg` Pool) | Yes |
| `JWT_SECRET` | Backend (sign/verify JWTs) | Yes |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres container + `init.sh` | Yes |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `init.sh` seed only (one-time) | No (defaults: `admin`/`password123`) |
| `GMAIL_USER` / `GMAIL_PASS` | Backend (Nodemailer) | No |
| `ADMIN_EMAIL` | Backend (email recipient) + `init.sh` | No |
| `VITE_API_URL` | Frontend build (overrides `/api` default) | No |
| `CORS_ORIGIN` | Backend (production CORS origin) | No |

> Never commit `.env`. The `.env` file drives all service configuration.

---

## Docker Compose Services

| Service | Image / Build | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16` | 5432 | Healthcheck via `pg_isready`; `init.sh` runs on first volume creation |
| `backend` | `Dockerfile.backend` | 5000 | Waits for postgres healthcheck; restarts unless stopped |
| `wedding-app` | `Dockerfile` | 3000 | Vite dev server; proxies `/api` to backend |

---

## Common Pitfalls

- **Do not** hardcode `http://backend:5000/api` in frontend code — use `API_BASE_URL`.
- **Do not** read settings boolean values as strings without coercion — they come from Postgres as `'true'`/`'false'`.
- **Do not** call `response.json()` without first checking `response.ok` — error responses also return JSON and will appear as success.
- **Do not** close admin modals on save before the `await` resolves successfully — modals must stay open on API failure.
- **Do not** add SQL-interpolated user input — always use parameterized queries.
- **Do not** modify `init.sh` data without re-initializing the volume (`docker-compose down -v`).
- Backend tests must mock all external modules before `require('../server')` — order matters in Jest.
