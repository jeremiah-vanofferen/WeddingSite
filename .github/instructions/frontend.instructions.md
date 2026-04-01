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
- **For public/read endpoints**: check `response.ok` before calling `.json()`:
  ```js
  const res = await fetch(`${API_BASE_URL}/endpoint`, options);
  if (!res.ok) throw new Error('...');
  const data = await res.json();
  ```
- **For admin/write operations**: ALWAYS use `requestJson(url, options, fallbackError)` from `src/utils/http.js` — never hand-roll fetch error handling for mutations, modal saves, or any authenticated operation.

## Admin Modal Pattern

**Every modal that writes data must follow this pattern exactly:**
- Initialize a `saveError` state to hold error messages.
- Clear `saveError` when opening the modal (`openModal()`) and when closing it (`closeModal()`).
- In the save handler:
  1. Clear `saveError` at the start.
  2. Call `requestJson()` with `await` — do not use raw `fetch`.
  3. On success, call `closeModal()` immediately after the `await` resolves.
  4. On error, catch the exception and set `saveError` — do NOT close the modal.
- Always display `saveError` in the UI if it is set (render above the form or as an alert).

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

**Do NOT:**
- Use raw `fetch()` for any admin/mutation operation — use `requestJson()` instead.
- Call `closeModal()` before the API call completes or on error.
- Ignore `saveError` — always render it in the modal UI.
- Attempt to parse response.json() yourself in a modal save — `requestJson()` handles it.

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

- `useAuth()` from `src/utils/AuthContext.jsx` returns `{ isLoggedIn, login, logout, adminName, loading }`.
- The auth token is stored in `localStorage` as `authToken`.
- Use `getAuthHeaders()` from `src/utils/http.js` to build `Authorization: Bearer <token>` headers.

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
