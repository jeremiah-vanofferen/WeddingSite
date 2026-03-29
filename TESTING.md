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

The application must be running via Docker Compose before executing these commands.

```bash
# Start services (if not already running)
docker-compose up -d

# Run backend tests (Jest)
docker exec weddingsite-backend-1 npm test

# Run frontend tests (Vitest)
docker exec weddingsite-wedding-app-1 npx vitest run
```

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
| [App.test.jsx](src/__tests__/App.test.jsx) | `App` | 8 | Routing, settings fetch on mount, CSS variable application, theme class, event name propagation |
| [AuthContext.test.jsx](src/__tests__/AuthContext.test.jsx) | `AuthContext` | 6 | Token verification, login / logout, `localStorage` persistence |
| [Navigation.test.jsx](src/__tests__/Navigation.test.jsx) | `Navigation` | 7 | Auth-based nav items, logout button visibility, website name display |
| [LoginModal.test.jsx](src/__tests__/LoginModal.test.jsx) | `LoginModal` | 5 | Form rendering, field input, credential submission, close button |
| [Home.test.jsx](src/__tests__/Home.test.jsx) | `Home` | 3 | Welcome message, venue details, API failure resilience |
| [RSVP.test.jsx](src/__tests__/RSVP.test.jsx) | `RSVP` | 4 | Form fields, successful submission, API error handling |
| [Contact.test.jsx](src/__tests__/Contact.test.jsx) | `Contact` | 4 | Form fields, API submission, error state display |
| [Schedule.test.jsx](src/__tests__/Schedule.test.jsx) | `Schedule` | 4 | Event list fetch, time formatting, empty state |
| [Admin.test.jsx](src/__tests__/Admin.test.jsx) | `Admin` | 16 | Auth guard, dashboard stats, modal open/close, save-error display, message management |
| [GuestManagementModal.test.jsx](src/__tests__/GuestManagementModal.test.jsx) | `GuestManagementModal` | 18 | Guest list display, add/edit/delete, CSV upload, bulk import (merge & replace) |
| [ScheduleModal.test.jsx](src/__tests__/ScheduleModal.test.jsx) | `ScheduleModal` | 7 | Event CRUD, add/edit modals, deletion |
| [PhotoGalleryModal.test.jsx](src/__tests__/PhotoGalleryModal.test.jsx) | `PhotoGalleryModal` | 12 | Photo list, featured toggle, add/edit/delete |
| [SettingsModal.test.jsx](src/__tests__/SettingsModal.test.jsx) | `SettingsModal` | 5 | Settings form display, reset to defaults, save submission |
| [WeddingDetailsModal.test.jsx](src/__tests__/WeddingDetailsModal.test.jsx) | `WeddingDetailsModal` | 5 | View details, toggle edit mode, form fields |

**Total: 104 frontend tests**

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

| File | Routes Under Test | Test Count | What Is Covered |
|---|---|---|---|
| [auth.test.js](backend/__tests__/auth.test.js) | `POST /api/auth/login`, `GET /api/auth/verify` | 8 | Missing credentials (400), wrong password (401), valid login returns JWT, token verification |
| [guests.test.js](backend/__tests__/guests.test.js) | `GET/POST/PUT/DELETE /api/guests` | 9 | List guests, add guest, duplicate email (409), update, delete, auth guard (401) |
| [guests-extended.test.js](backend/__tests__/guests-extended.test.js) | `POST /api/guests/bulk` | 8 | CSV bulk import (merge & replace modes), transaction commit, rollback on error |
| [public.test.js](backend/__tests__/public.test.js) | `/api/health`, `/api/public/settings`, `/api/rsvp`, `/api/messages` | 9 | Health check, public settings, RSVP submission (including guest-count validation), contact message submission |
| [schedule.test.js](backend/__tests__/schedule.test.js) | `GET/POST/PUT/DELETE /api/schedule` | 9+ | List events, add event, update (including reorder via transaction), delete, auth guard |
| [settings-messages.test.js](backend/__tests__/settings-messages.test.js) | `/api/settings`, `/api/messages` | 13 | Get/update settings, list messages, mark as read, admin email lookup |

**Total: 66 backend tests**

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
