---
applyTo: "backend/**"
---

# Backend Instructions

The backend is a **single-file Express app** (`backend/server.js`) using **CommonJS** (`require`/`module.exports`). Node.js 22.x, PostgreSQL 16 via the `pg` npm package.

## Code Style

- CommonJS only — use `require()` and `module.exports`. Do not use `import`/`export`.
- Use `async`/`await` throughout; avoid raw Promise chains.
- Every route handler must be wrapped in `try/catch`; the catch block logs with `console.error` and returns `res.status(500).json({ error: 'Internal server error' })`.
- Unused parameter names must be prefixed with `_` (ESLint rule).

## Database

- All queries go through the shared `pool` (a `pg.Pool` instance).
- **Always use parameterized queries**: `pool.query('SELECT * FROM guests WHERE id = $1', [id])`.
- Never interpolate user-supplied values into SQL strings.
- For multi-step writes, use a transaction client:
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
- Boolean settings are stored in the `settings` table as the strings `'true'`/`'false'`, not native booleans.

## Auth

- Protected routes must use the `authenticateToken` middleware.
- The middleware attaches `req.user = { id, username }` on success.
- Return 401 for missing token, 403 for invalid/expired token.

## Rate Limiting

- General API: `limiter` (100 req / 15 min) is applied to all `/api/` routes.
- Sensitive endpoints also use `strictLimiter` (20 req / 15 min): `/api/auth/login`, `/api/rsvp`, `/api/messages`.
- When adding new public submission endpoints, apply `strictLimiter` inline: `app.post('/api/new-endpoint', strictLimiter, handler)`.

## Input Validation Pattern

```js
const { field } = req.body;
if (!field) return res.status(400).json({ error: 'field is required' });
```

For numeric fields:
```js
const parsed = Number.parseInt(value, 10);
if (!Number.isInteger(parsed) || parsed < 0) {
  return res.status(400).json({ error: 'value must be a non-negative integer' });
}
```

## Writing Tests

- File: `backend/__tests__/<feature>.test.js`
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
- Per-test query stubs: `pool.query.mockResolvedValueOnce({ rows: [...] })`.
- Tests run serially (`jest --runInBand`) to avoid shared mock state conflicts.
