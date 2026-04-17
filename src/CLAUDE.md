# Frontend

React 18 SPA built with Vite. ES modules (`import`/`export`). Functional components and hooks only — no class components.

## API Calls

- **Always** import `API_BASE_URL` from `src/utils/api.js` — never hardcode `/api/...` URLs.
- Public/read endpoints: check `response.ok` before `.json()`:
  ```js
  const res = await fetch(`${API_BASE_URL}/endpoint`, options);
  if (!res.ok) throw new Error('...');
  const data = await res.json();
  ```
- Admin/write operations: **always** use `requestJson(url, options, fallbackError)` from `src/utils/http.js` — never hand-roll fetch error handling for mutations or authenticated operations.

## Admin Modal Pattern

Every modal that writes data must follow this pattern exactly:

```js
const [saveError, setSaveError] = useState('');

const openModal = (modalType, item = null) => {
  setSaveError('');
  setActiveModal(modalType);
  setEditingItem(item);
};

const closeModal = () => {
  setSaveError('');
  setActiveModal(null);
  setEditingItem(null);
};

const handleSave = async (data) => {
  setSaveError('');
  try {
    await requestJson(`${API_BASE_URL}/entity`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    }, 'Save failed.');
    closeModal(); // Only called on success
  } catch (err) {
    setSaveError(err.message || 'Save failed.'); // Modal stays open
  }
};
```

- Clear `saveError` on open and close.
- `closeModal()` only on success — never on error.
- Always render `saveError` in the modal UI.

## Settings

- `DEFAULT_SETTINGS` in `src/utils/constants.js` is authoritative. Always spread as base:
  ```js
  setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...data }));
  ```
- Coerce booleans defensively (API may return string or boolean):
  ```js
  showCountdown: data.showCountdown === true || data.showCountdown === 'true'
  ```

## Auth

- `useAuth()` from `src/utils/AuthContext.jsx` → `{ isLoggedIn, login, logout, adminName, loading }`.
- Token stored in `localStorage` as `authToken`.
- Use `getAuthHeaders()` from `src/utils/http.js` to build `Authorization: Bearer <token>` headers.

## Theming

- CSS variables and theme class (`theme-<name>` on `document.body`) set **only** in `App.jsx`.

## CSS

- Styles scoped per component/page in the matching `.css` file (e.g., `Admin.css` for `Admin.jsx`).
- Page-level shared styles go in `src/pages/pages.css`.

## Lazy-Loading

- Admin modals are lazy-loaded via `React.lazy` + `<Suspense fallback={null}>`.
- In tests, use `await screen.findByTestId(...)` (async) for lazy-loaded modals.

## Running Tests

```bash
# Docker (preferred)
./test-docker.sh frontend

# Local
npm test             # Vitest run
npm run coverage     # Vitest coverage
```

## Writing Tests

- File: `__tests__/<ComponentName>.test.jsx`
- Import from `vitest` and `@testing-library/react`.
- Mock `global.fetch` in `beforeEach`:
  ```js
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
  );
  ```
- Mock context and sibling components with `vi.mock()`.
- Suppress expected console errors:
  ```js
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  // ... test ...
  spy.mockRestore();
  ```
- Use `waitFor` / `screen.findBy*` for async state updates.
- Clean up side effects in `afterEach` (e.g., `document.body.className = ''`).
