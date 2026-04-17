# Backend

Node.js 22.x, PostgreSQL 16 via `pg`. CommonJS throughout.

## Structure

```
backend/
  server.js           ← slim entry point: middleware, mount routers, start server
  db.js               ← pool, migrations (ensureGuestCountColumn, ensureApprovalStatusColumn), getAdminEmail, normalizeGuestCount
  middleware.js       ← authenticateToken, authenticatePublicToken, limiter, strictLimiter, sendError helpers
  upload.js           ← multer config (uploadDir, uploadPhoto)
  routes/
    health.js         ← GET  /api/health
    public/
      token.js        ← POST /api/public/token
      settings.js     ← GET  /api/public/settings
      guestLookup.js  ← GET  /api/public/guest-lookup
      rsvp.js         ← POST /api/rsvp
      messages.js     ← POST /api/messages
      gallery.js      ← GET  /api/gallery, /carousel/featured; POST /upload, /upload-file
      schedule.js     ← GET  /api/schedule
    private/
      auth.js         ← GET  /api/auth/verify; POST /login, /change-password
      guests.js       ← CRUD /api/guests + /bulk + /pending-approvals + /:id/approval
      messages.js     ← GET  /api/messages; PUT /:id/read
      settings.js     ← GET/PUT /api/settings + /admin-email
      gallery.js      ← admin /api/gallery endpoints + /upload-file-admin
      schedule.js     ← POST/PUT/DELETE /api/schedule
```

## Adding a New Endpoint

**Public endpoint** (no admin auth):
1. Create `routes/public/<feature>.js` exporting a Router.
2. Apply `authenticatePublicToken` per-route (imported from `../../middleware`).
3. If it accepts user submissions, add `strictLimiter` before `authenticatePublicToken`.
4. Mount in `server.js`: `app.use('/api', require('./routes/public/<feature>'))`.

**Private endpoint** (admin auth required):
1. Create `routes/private/<feature>.js` exporting a Router.
2. Apply `authenticateToken` per-route (imported from `../../middleware`).
3. Mount in `server.js`: `app.use('/api/<resource>', require('./routes/private/<feature>'))`.

Route files import shared utilities:
```js
const { pool, getAdminEmail, normalizeGuestCount, ensureApprovalStatusColumn } = require('../../db');
const { authenticateToken, authenticatePublicToken, strictLimiter, sendBadRequest, sendNotFound, sendInternalError } = require('../../middleware');
const { uploadPhoto, uploadDir } = require('../../upload'); // only if handling file uploads
```

## Code Style

- **CommonJS only** — `require()`/`module.exports`. No `import`/`export`.
- `async`/`await` throughout; avoid raw Promise chains.
- Every async route must `try/catch` and return `res.status(500).json({ error: 'Internal server error' })` or use `sendInternalError(res, context, error)`.
- Unused params prefixed with `_` (ESLint rule).

## Database

- All queries via shared `pool` (`pg.Pool`).
- **Always parameterized**: `pool.query('SELECT * FROM t WHERE id = $1', [id])`. Never interpolate user input.
- Multi-step writes use a transaction client:
  ```js
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ... queries ...
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  ```
- Boolean settings stored as strings `'true'`/`'false'` in the `settings` table.

## Auth

- Protected routes use `authenticateToken` middleware → attaches `req.user = { id, username }`.
- Return 401 for missing token, 403 for invalid/expired token.

## Rate Limiting

- `limiter` (100 req/15 min) applied globally to all `/api/` routes in `server.js`.
- `strictLimiter` (20 req/15 min prod, relaxed in dev/test) applied in two ways:
  - **Globally in `server.js`**: `/api/auth/login`, `/api/auth/change-password`, `/api/rsvp`, `/api/public/token`.
  - **Inline in the route file**: `/api/messages`, `/api/gallery/upload`, `/api/gallery/upload-file`.
- New public submission endpoints: add `strictLimiter` as the first argument in the route definition inside the route file.

## Input Validation

```js
const { field } = req.body;
if (!field) return res.status(400).json({ error: 'field is required' });

// Numeric fields:
const parsed = Number.parseInt(value, 10);
if (!Number.isInteger(parsed) || parsed < 0) {
  return res.status(400).json({ error: 'value must be a non-negative integer' });
}
```

## Running Tests

```bash
# Docker (preferred)
./test-docker.sh backend

# Local
cd backend && npm test   # Jest --runInBand
```

## Writing Tests

- File: `__tests__/<feature>.test.js`
- Mock all external modules **before** `require('../server')` — order matters:
  ```js
  jest.mock('dotenv', () => ({ config: jest.fn() }));
  jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })) }));
  jest.mock('pg', () => {
    const Pool = jest.fn().mockImplementation(() => ({ query: jest.fn(), connect: jest.fn(), end: jest.fn() }));
    return { Pool };
  });
  jest.mock('bcryptjs');
  jest.mock('jsonwebtoken');
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  ```
- Capture pool: `const pool = Pool.mock.results[0].value;`
- Each `beforeEach`: `jest.resetAllMocks()` + silence console noise:
  ```js
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  ```
- Per-test stubs: `pool.query.mockResolvedValueOnce({ rows: [...] })`.
- Tests run serially (`jest --runInBand`) to avoid shared mock state conflicts.
