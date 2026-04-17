# WeddingSite

A full-stack wedding app: React 18 SPA frontend (Vite) + single-file Express backend (`backend/server.js`) + PostgreSQL 16.

## Project Structure

- `src/` — React frontend (ES modules)
- `backend/server.js` — Express entry point; routes split across `backend/routes/public/` and `backend/routes/private/`
- `backend/__tests__/` — backend Jest tests
- `src/__tests__/` — frontend Vitest tests

## Commands

```bash
# Tests in Docker (preferred — no local Node.js required)
./test-docker.sh            # run all tests
./test-docker.sh frontend   # Vitest only
./test-docker.sh backend    # Jest only

# Frontend (local)
npm run dev          # Vite dev server
npm run build        # production build
npm run lint         # ESLint src/
npm test             # Vitest run
npm run coverage     # Vitest coverage

# Backend (local)
cd backend && npm test   # Jest --runInBand
```

See `backend/CLAUDE.md` for backend rules and `src/CLAUDE.md` for frontend rules.
