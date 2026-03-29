---
applyTo: "src/**"
---

# Frontend Instructions

The frontend is a **React 18 SPA** built with **Vite**, using **ES modules** (`import`/`export`). Functional components and hooks only — no class components.

## API Calls

- **Always** import `API_BASE_URL` from `src/utils/api.js`:
  ```js
  import { API_BASE_URL } from '../utils/api';
  ```
- Never hardcode `/api/...` or `http://backend:5000/api/...` strings directly.
- **Always** check `response.ok` before calling `.json()`:
  ```js
  const res = await fetch(`${API_BASE_URL}/endpoint`, options);
  if (!res.ok) throw new Error('...');
  const data = await res.json();
  ```
- For admin save operations, use the `requestJson(url, options, fallbackError)` helper in `Admin.jsx` as the model — it checks status, parses JSON, and throws on non-2xx.

## Admin Modal Pattern

- Show save errors in a `saveError` state; display them in the UI without closing the modal.
- Only call `closeModal()` after a successful `await` of the API call.
- Clear `saveError` in `openModal()` and `closeModal()`.

```js
const [saveError, setSaveError] = useState('');

const handleSave = async (data) => {
  setSaveError('');
  try {
    await requestJson(`${API_BASE_URL}/...`, { method: 'POST', ... }, 'Save failed.');
    closeModal();
  } catch (err) {
    setSaveError(err.message || 'Save failed.');
  }
};
```

## Settings

- `DEFAULT_SETTINGS` in `src/utils/constants.js` is the authoritative source of defaults. Always spread it as the base:
  ```js
  setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...data }));
  ```
- Boolean settings may arrive from the API as either `true` (boolean) or `'true'` (string) — coerce defensively:
  ```js
  showCountdown: data.showCountdown === true || data.showCountdown === 'true'
  ```

## Auth

- `useAuth()` from `src/AuthContext.jsx` returns `{ isLoggedIn, login, logout, adminName, loading }`.
- The auth token is stored in `localStorage` as `authToken`.
- Use `getAuthHeaders()` in `Admin.jsx` to build `Authorization: Bearer <token>` headers.

## Theming

- CSS variables and the theme class on `<body>` are set **only** in `App.jsx`. Do not apply them in other components.
- Theme class format: `theme-<name>` on `document.body`.

## Lazy-Loading

- Admin modals are lazy-loaded via `React.lazy` + `<Suspense fallback={null}>`.
- When writing tests that open modals, use `await screen.findByTestId(...)` (async) instead of `screen.getByTestId(...)`.

## CSS

- Styles are scoped per component/page. Add styles to the matching `.css` file (e.g., `Admin.css` for `Admin.jsx`).
- Page-level shared styles go in `src/pages/pages.css`.

## Writing Tests

- File: `src/__tests__/<ComponentName>.test.jsx`
- Import from `vitest` and `@testing-library/react`.
- Mock `global.fetch` in `beforeEach`:
  ```js
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
  );
  ```
- Mock context and sibling components with `vi.mock()`.
- For error paths that produce expected console output, suppress noise:
  ```js
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  // ... test ...
  spy.mockRestore();
  ```
- Use `waitFor` for async state updates; use `screen.findBy*` for elements that appear after async actions.
- Clean up side effects in `afterEach` (e.g., `document.body.className = ''`).
