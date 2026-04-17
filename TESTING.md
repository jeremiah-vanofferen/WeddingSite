# Testing Documentation

This project has full test coverage across the frontend (React) and backend (Express API), using separate test runners suited to each environment.

---

## Table of Contents

- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
  - [In Docker (recommended)](#in-docker-recommended)
  - [Locally](#locally)
- [Linting](#linting)
  - [In Docker](#in-docker)
  - [Locally (lint)](#locally-lint)
- [Frontend Tests](#frontend-tests)
  - [Configuration](#frontend-configuration)
  - [Test Files](#frontend-test-files)
  - [Patterns & Conventions](#frontend-patterns--conventions)
- [Backend Tests](#backend-tests)
  - [Configuration](#backend-configuration)
  - [Test Files](#backend-test-files)
  - [Patterns & Conventions](#backend-patterns--conventions)
- [Writing New Tests](#writing-new-tests)
- [CI](#ci)

---

## Test Stack

| Layer | Runner | Library | Environment |
|---|---|---|---|
| Frontend | [Vitest](https://vitest.dev/) | [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | jsdom |
| Backend | [Jest](https://jestjs.io/) | [Supertest](https://github.com/ladjs/supertest) | Node.js |

---

## Running Tests

### In Docker (recommended)

```bash
# No running stack required — spins up a one-off container per suite
./test-docker.sh            # run all tests
./test-docker.sh frontend   # Vitest only
./test-docker.sh backend    # Jest only
```

Public endpoint auth note:

- Outside `NODE_ENV=test`, public API routes require an anonymous JWT minted from `POST /api/public/token`.
- Frontend helpers (`fetchArray`, `fetchJsonOrFallback`) and `getPublicAuthHeaders()` handle this automatically.
- Backend tests run with `NODE_ENV=test`, so anonymous-token checks are bypassed by design.

### Locally

Requires Node.js 22.x.

```bash
# Frontend — from the project root
npm install
npm test              # Run once
npm run test:watch    # Watch mode (re-runs on file changes)
npm run lint          # ESLint check

# Backend — from the backend/ directory
cd backend
npm install
npm test
```

---

## Linting

The project uses [ESLint](https://eslint.org/) v9 (flat config) for both the frontend and backend. The frontend config lives in [eslint.config.js](eslint.config.js) and covers React/JSX, React Hooks, `react/prop-types`, and strict equality rules. The backend uses the same ESLint installation scoped to `server.js`.

### In Docker

The application must be running via Docker Compose before executing these commands.

```bash
# Lint frontend (src/)
docker exec weddingsite-wedding-app-1 npm run lint

# Lint backend (server.js)
docker exec weddingsite-backend-1 npm run lint
```

Both commands are also available as VS Code tasks under **Terminal → Run Task…**:
- **Lint: Frontend (ESLint)**
- **Lint: Backend (ESLint)**
- **Lint: All** — runs both sequentially

### Locally (lint)

Requires Node.js 22.x.

```bash
# Frontend — from the project root
npm run lint

# Backend — from the backend/ directory
cd backend
npm run lint
```

---

## Frontend Tests

### Frontend Configuration

Configuration lives in [vite.config.js](vite.config.js):

```js
test: {
  environment: 'jsdom',
  setupFiles: './src/setupTests.js',
  include: ['src/__tests__/**/*.test.{js,jsx}'],
}
```

The setup file ([src/setupTests.js](src/setupTests.js)) imports `@testing-library/jest-dom`, which adds DOM-specific matchers like `toBeInTheDocument()`, `toHaveValue()`, and `toBeDisabled()`.

### Frontend Test Files

All test files live in `src/__tests__/`.

| File | Component Under Test | Test Count | What Is Covered |
|---|---|---|---|
| [App.test.jsx](src/__tests__/App.test.jsx) | `App` | 8 | Routing, settings fetch on mount, CSS variable application, theme class, boolean coercion, event name propagation |
| [AuthContext.test.jsx](src/__tests__/AuthContext.test.jsx) | `AuthContext` | 6 | Token verification, login / logout, `localStorage` persistence |
| [Navigation.test.jsx](src/__tests__/Navigation.test.jsx) | `Navigation` | 12 | Auth-based nav items, logout button visibility, RSVP link toggle, website name display, login modal open/close/success |
| [LoginModal.test.jsx](src/__tests__/LoginModal.test.jsx) | `LoginModal` | 5 | Form rendering, field input, credential submission, error display, close button |
| [Home.test.jsx](src/__tests__/Home.test.jsx) | `Home` | 7 | Welcome message, venue details, registry link, countdown visibility, post-wedding arrival message, API failure resilience |
| [RSVP.test.jsx](src/__tests__/RSVP.test.jsx) | `RSVP` | 8 | Form fields, name autofill, successful submission, API error handling, fallback error, payload validation, privacy modal show/accept/decline |
| [Contact.test.jsx](src/__tests__/Contact.test.jsx) | `Contact` | 8 | Form fields, name autofill, API submission, error state display, fallback error, payload validation, privacy modal show/accept/decline |
| [Schedule.test.jsx](src/__tests__/Schedule.test.jsx) | `Schedule` | 4 | Event list fetch, time formatting, empty state, non-array guard |
| [Admin.test.jsx](src/__tests__/Admin.test.jsx) | `Admin` | 18 | Auth guard, dashboard stats, modal open/close, save-error display, message management |
| [GuestManagementModal.test.jsx](src/__tests__/GuestManagementModal.test.jsx) | `GuestManagementModal` | 28 | Guest list display, add/edit/delete, RSVP updates, stat counts, CSV export, CSV upload, bulk import (merge & replace), validation errors, legacy format parsing |
| [ScheduleModal.test.jsx](src/__tests__/ScheduleModal.test.jsx) | `ScheduleModal` | 12 | Event CRUD, add/edit modals, deletion with confirm, up/down reorder arrows |
| [PhotoGalleryModal.test.jsx](src/__tests__/PhotoGalleryModal.test.jsx) | `PhotoGalleryModal` | 13 | Photo list, featured badge, featured toggle, add (single & multi-file, preview), edit, delete |
| [Gallery.test.jsx](src/__tests__/Gallery.test.jsx) | `Gallery` | 12 | Gallery fetch/display, lightbox open/close/overlay, upload modal interaction, success callback |
| [GalleryApprovalModal.test.jsx](src/__tests__/GalleryApprovalModal.test.jsx) | `GalleryApprovalModal` | 5 | Pending photos load, approve/reject flow, error display, modal close |
| [PhotoCarousel.test.jsx](src/__tests__/PhotoCarousel.test.jsx) | `PhotoCarousel` | 8 | Autoplay timing, empty state, rapid next/prev/dot/alternating clicks, slide mode reliability, invalid speed fallback |
| [PublicPhotoUploadModal.test.jsx](src/__tests__/PublicPhotoUploadModal.test.jsx) | `PublicPhotoUploadModal` | 7 | Upload validation, file preview, form data submission, API/network error handling, overlay/cancel close |
| [ChangePasswordModal.test.jsx](src/__tests__/ChangePasswordModal.test.jsx) | `ChangePasswordModal` | 6 | Password validation, error clearing, submit payload, close interactions |
| [SettingsModal.test.jsx](src/__tests__/SettingsModal.test.jsx) | `SettingsModal` | 8 | Settings form display, field pre-fill, reset to defaults, save submission, live color preview, save error display |
| [WeddingDetailsModal.test.jsx](src/__tests__/WeddingDetailsModal.test.jsx) | `WeddingDetailsModal` | 6 | View details modal, edit form fields, save/close, timezone auto-fill from address |
| [dateTime.test.js](src/__tests__/dateTime.test.js) | `dateTime` utils | 35 | `resolveTimeZone`, `formatWeddingDate`, `formatTimeOfDay`, `formatIsoDate`, `formatIsoDateTime`, `getTimeZoneLabel`, `dateTimeToUTC` — null/invalid/valid inputs for each |
| [timezones.test.jsx](src/__tests__/timezones.test.jsx) | `timezones` utils | 11 | Timezone derivation from US, Canadian, UK, and Australian addresses; false-positive guards for substring matches |
| [http.test.js](src/__tests__/http.test.js) | `http` utils | 5 | `getAuthHeaders` header merging, `requestJson` success/network-error/API-error/non-JSON-error paths |
| [publicData.test.js](src/__tests__/publicData.test.js) | `publicData` utils | 2 | Anonymous-token retry on 401, fallback return on repeated failure |

**Total: 237 frontend tests**

### Frontend Patterns & Conventions

**Module mocking with `vi.mock`**

Child components and context providers are replaced with lightweight stubs so tests stay focused on the component under test:

```jsx
vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ isLoggedIn: false, logout: vi.fn(), adminName: null }),
}));
```

**`fetch` mocking**

Network calls are intercepted via `global.fetch`:

```js
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
  );
});
```

Tests should include `ok` in mocked responses when the component checks `response.ok` before consuming JSON.

**`waitFor` for async rendering**

Use `waitFor` (from React Testing Library) to assert on elements that appear after a fetch resolves:

```jsx
await waitFor(() => expect(screen.getByText('My Wedding')).toBeInTheDocument());
```

**`userEvent` for interactions**

Prefer `@testing-library/user-event` over raw `fireEvent` for simulating realistic user input (typing, clicking, selecting).

**Cleanup**

Side effects like body class names or localStorage entries added during a test are cleared in `afterEach`:

```js
afterEach(() => {
  document.body.className = '';
});
```

**Console noise suppression for expected error paths**

Some tests intentionally trigger failure paths (for example mocked DB/network errors) and now stub `console.error` / `console.warn` inside test setup. This keeps CI and local test output focused on real failures while preserving assertions on 500/4xx behavior.

---

## Backend Tests

### Backend Configuration

Configuration lives in [backend/jest.config.js](backend/jest.config.js):

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
};
```

Tests run serially (`--runInBand` in `backend/package.json`) to avoid shared state issues with the mocked PostgreSQL pool.

### Backend Test Files

All test files live in `backend/__tests__/`.

Seeding regression coverage:

- [backend/__tests__/init-seeding.test.js](backend/__tests__/init-seeding.test.js) validates `init.sh` keeps critical seed protections in place:
  - uploads cleanup excludes `.gitkeep`
  - seeded images are inserted with `featured = TRUE`
  - guest CSV import supports both known formats
  - simple-format guest count has numeric validation fallback

| File | Routes Under Test | Test Count | What Is Covered |
|---|---|---|---|
| [auth.test.js](backend/__tests__/auth.test.js) | `POST /api/auth/login`, `GET /api/auth/verify`, `POST /api/auth/change-password` | 13 | Missing credentials (400), wrong password (401), valid login returns JWT, token verification, change-password validation and success |
| [public-auth.test.js](backend/__tests__/public-auth.test.js) | `POST /api/public/token` | 6 | Anonymous JWT minting, public-route token guard (401/403), admin token rejected on public-only routes, health check stays open |
| [guests.test.js](backend/__tests__/guests.test.js) | `GET/POST/PUT/DELETE /api/guests` | 10 | List guests, add guest (with and without email), duplicate email (409), update, delete, auth guard (401) |
| [guests-extended.test.js](backend/__tests__/guests-extended.test.js) | `POST /api/guests/bulk` | 9 | CSV bulk import (merge & replace modes), transaction commit, rollback on error, 500 paths for list/update/delete |
| [public.test.js](backend/__tests__/public.test.js) | `/api/health`, `/api/public/settings`, `/api/public/guest-names`, `/api/public/guest-lookup`, `/api/schedule`, `/api/rsvp`, `/api/messages` | 18 | Health check, public settings, guest name/lookup endpoints, schedule list, RSVP submission (guest-count validation, email-match logic), contact message submission |
| [schedule.test.js](backend/__tests__/schedule.test.js) | `POST/PUT/DELETE /api/schedule`, `PUT /api/schedule` (reorder) | 14 | Add event, update, reorder (transaction commit & rollback), delete, 404 and 500 paths, auth guard |
| [settings-messages.test.js](backend/__tests__/settings-messages.test.js) | `GET/PUT /api/settings`, `GET/PUT /api/settings/admin-email`, `GET /api/messages`, `PUT /api/messages/:id/read` | 17 | Get/update settings, admin-email get/update, list messages, mark as read, auth guard (401), 404/500 paths |
| [gallery.test.js](backend/__tests__/gallery.test.js) | `POST /api/gallery/upload`, `POST /api/gallery/upload-file`, `GET /api/gallery`, `GET /api/gallery/pending`, `PUT /api/gallery/:id/status`, `PUT /api/gallery/:id`, `DELETE /api/gallery/:id` | 28 | URL and file upload validation (400/201), approved/pending gallery fetch, status approval/rejection, photo edit, delete, auth guard (401), 404/500 paths |

**Total: 113 backend route tests** (+ 5 seeding regression tests in `init-seeding.test.js` = **118 total**)

### Backend Patterns & Conventions

**Mocking all external dependencies at the top of each file**

`pg`, `bcryptjs`, `jsonwebtoken`, `nodemailer`, and `dotenv` are all mocked before `server.js` is required, so no real database or email connections are made:

```js
jest.mock('pg', () => {
  const Pool = jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  }));
  return { Pool };
});
```

**Capturing the pool instance**

After the mock is set up and `server.js` is required, the pool instance created by the server is captured for per-test query stubbing:

```js
const pool = Pool.mock.results[0].value;
```

**Per-test query stubs with `mockResolvedValueOnce`**

Each test stubs only the specific queries it expects, keeping tests independent:

```js
pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Alice' }] });
```

**Transaction testing**

Tests for transactional routes (bulk import, schedule reorder) capture the client connection and stub `client.query` separately:

```js
const client = { query: jest.fn(), release: jest.fn() };
pool.connect.mockResolvedValueOnce(client);
client.query
  .mockResolvedValueOnce({})           // BEGIN
  .mockResolvedValueOnce({ rows: [] }) // DELETE
  .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT
```

**JWT middleware**

Protected routes are tested both with a valid token and without one. `jsonwebtoken.verify` is mocked to return a fake decoded payload:

```js
jwt.verify.mockImplementation((token, secret, cb) => cb(null, { id: 1, username: 'admin' }));
```

---

## CI

Two GitHub Actions workflows automatically run lint and tests on every push and pull request.

| Workflow | Runs | Steps |
|---|---|---|
| `.github/workflows/frontend-ci.yml` | On changes to `src/**`, `public/**`, config files | `npm ci` → `npm run lint` → `npm test` |
| `.github/workflows/backend-ci.yml` | On changes to `backend/**` | `npm ci` → `npm run lint` → `npm test` |

Both workflows use Node.js 22, cache `node_modules` via `npm ci`, and cancel in-progress runs when a newer commit is pushed to the same branch.

---

## Writing New Tests

### Frontend

1. Create a file in `src/__tests__/` named `<ComponentName>.test.jsx`.
2. Import from `vitest` and `@testing-library/react`.
3. Mock any context or sibling components your component consumes.
4. Stub `global.fetch` for API calls.
5. Use `render`, `screen`, `waitFor`, and `userEvent` to exercise behaviour.

Minimal example:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MyComponent from '../MyComponent';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ key: 'value' }) })
  );
});

describe('MyComponent', () => {
  it('renders fetched data', async () => {
    render(<MyComponent />);
    await waitFor(() => expect(screen.getByText('value')).toBeInTheDocument());
  });
});
```

### Backend

1. Create a file in `backend/__tests__/` named `<feature>.test.js`.
2. Mock `pg`, `bcryptjs`, `jsonwebtoken`, `nodemailer`, and `dotenv` at the top — before requiring `server`.
3. Capture the pool instance from `Pool.mock.results[0].value`.
4. Use `supertest` to make HTTP requests against the Express app.
5. Stub `pool.query` (or `pool.connect` + `client.query` for transactions) per test.

Minimal example:

```js
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));
jest.mock('pg', () => {
  const Pool = jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  }));
  return { Pool };
});
jest.mock('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = require('../server');

const pool = Pool.mock.results[0].value;

describe('GET /api/my-route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 200 with data', async () => {
    jwt.verify.mockImplementation((t, s, cb) => cb(null, { id: 1 }));
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });

    const res = await request(app)
      .get('/api/my-route')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Test' }]);
  });
});
```
