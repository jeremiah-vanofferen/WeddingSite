# Wedding Website

A full-stack wedding website with a React frontend, Node.js/Express backend, and PostgreSQL database. Supports guest management, RSVP, scheduling, contact forms, photo gallery, and a full admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Node.js 22, Express |
| Database | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| Container | Docker, Docker Compose |

## Features

- **Home page** — Wedding details, countdown timer, and welcome message (all configurable via admin)
- **Schedule page** — Publicly visible event timeline, managed from the admin panel
- **RSVP page** — Guest self-service RSVP with party size and dietary notes; triggers email notification to admin
- **Contact page** — Contact form that saves messages to the database and emails the admin
- **Admin panel** — Password-protected dashboard with:
  - Wedding details management
  - Guest list (add, edit, delete, bulk CSV import)
  - Schedule event management (add, edit, delete, reorder)
  - Photo gallery management
  - Site settings (theme, colors, font, countdown toggle, RSVP toggle, welcome message, admin email)
  - Contact message inbox with read/unread tracking

## Quick Start

### Prerequisites

- Docker and Docker Compose

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL
POSTGRES_DB=wedding_db
POSTGRES_USER=wedding_user
POSTGRES_PASSWORD=your_secure_password

# Backend
DATABASE_URL=postgresql://wedding_user:your_secure_password@postgres:5432/wedding_db
JWT_SECRET=your_jwt_secret_change_this

# Admin credentials (set before first run to override defaults)
ADMIN_USERNAME=YourName
ADMIN_PASSWORD=your_secure_password

# Email notifications (optional)
GMAIL_USER=your@gmail.com
GMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=your@gmail.com
```

> **Gmail note:** Use an [App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password.

### 2. Start All Services

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| PostgreSQL | localhost:5432 |

### 3. Admin Login

Navigate to http://localhost:3000/admin and log in with the credentials set in your `.env` file (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

If those variables are not set, the fallback defaults are:

- **Username:** `admin`
- **Password:** `password123`

> **Important:** Always set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` before the first run. Credentials are seeded once at database initialization — changing them in `.env` after the database volume exists has no effect without re-initializing (see below).

### Stop Services

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

### Re-seeding the Database

The `init.sh` script only runs when the database volume is first created. To apply changes to admin credentials or other seed data to an existing environment:

```bash
docker-compose down -v   # removes the postgres_data volume
docker-compose up --build
```

> This wipes all data. Export your guest list from the admin panel first if needed.

## Local Development (without Docker)

Requires Node.js 22.x and a running PostgreSQL instance.

```bash
# Frontend
npm install
npm run dev          # http://localhost:3000

# Backend (in a separate terminal)
cd backend
npm install
npm run dev          # http://localhost:5000
```

## CI / GitHub Actions

Two GitHub Actions workflows run automatically on every push to `main`, `master`, or `develop`, and on any pull request that touches the relevant paths.

| Workflow | File | Triggers on |
|---|---|---|
| Frontend CI | `.github/workflows/frontend-ci.yml` | `src/**`, `public/**`, `package*.json`, `vite.config.js`, `eslint.config.js` |
| Backend CI | `.github/workflows/backend-ci.yml` | `backend/**` |

Each workflow runs **lint → test** in sequence. Concurrent runs on the same branch are cancelled to avoid redundant work.

To use these as required status checks, go to **Settings → Branches → Branch protection rules** in GitHub and add `Lint and Test Frontend` / `Lint and Test Backend` as required checks.

## Project Structure

```
.
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml # GitHub Actions — lint + test frontend
│       └── backend-ci.yml  # GitHub Actions — lint + test backend
├── Dockerfile              # Frontend container (Node 22 Alpine)
├── Dockerfile.backend      # Backend container (Node 22 Alpine)
├── docker-compose.yml      # Orchestrates frontend, backend, and postgres
├── init.sh                 # PostgreSQL initialization script (tables + seed data)
├── vite.config.js          # Vite configuration
├── package.json            # Frontend dependencies
├── index.html              # HTML entry point
├── public/
│   └── sample-guests.csv   # Sample CSV for bulk guest import
├── backend/
│   ├── server.js           # Express API server
│   └── package.json        # Backend dependencies
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Root component with routing and theme management
    ├── AuthContext.jsx     # JWT authentication context
    ├── Navigation.jsx      # Site navigation bar
    ├── LoginModal.jsx      # Admin login modal
    ├── components/
    │   ├── GuestManagementModal.jsx    # Guest CRUD + CSV import
    │   ├── PhotoGalleryModal.jsx       # Photo gallery management
    │   ├── ScheduleModal.jsx           # Schedule event management
    │   ├── SettingsModal.jsx           # Site-wide settings
    │   └── WeddingDetailsModal.jsx     # Wedding details management
    └── pages/
        ├── Home.jsx        # Landing page with countdown
        ├── Schedule.jsx    # Public event schedule
        ├── RSVP.jsx        # Guest RSVP form
        ├── Contact.jsx     # Contact form
        └── Admin.jsx       # Admin dashboard
```

## Database Schema

| Table | Description |
|---|---|
| `guests` | Guest list with RSVP status, plus-one, phone, address |
| `admin_users` | Admin accounts with bcrypt-hashed passwords |
| `messages` | Contact form submissions with read/unread status |
| `settings` | Key-value store for all site settings |
| `schedule` | Wedding day event timeline |

## API Endpoints

### Public (no auth required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/settings` | Site settings and wedding details |
| `GET` | `/api/schedule` | Wedding day schedule |
| `POST` | `/api/rsvp` | Submit a guest RSVP |
| `POST` | `/api/messages` | Submit a contact message |
| `GET` | `/api/health` | Health check |

### Admin (JWT required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and get JWT |
| `GET` | `/api/auth/verify` | Verify JWT token |
| `GET` | `/api/guests` | List all guests |
| `POST` | `/api/guests` | Add a guest |
| `PUT` | `/api/guests/:id` | Update a guest |
| `DELETE` | `/api/guests/:id` | Delete a guest |
| `POST` | `/api/guests/bulk` | Bulk import guests (CSV) |
| `GET` | `/api/messages` | List contact messages |
| `PUT` | `/api/messages/:id/read` | Mark message as read |
| `GET` | `/api/settings` | Get all settings |
| `POST` | `/api/settings` | Update settings |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWTs |
| `POSTGRES_DB` | Yes | Database name |
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `ADMIN_USERNAME` | No | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | No | Admin login password (default: `password123`) |
| `WEBSITE_NAME` | No | Website name shown in nav and home page (default: `My Wedding`) |
| `GMAIL_USER` | No | Gmail address for sending notifications |
| `GMAIL_PASS` | No | Gmail App Password |
| `ADMIN_EMAIL` | No | Recipient address for email notifications |
| `VITE_API_URL` | No | Backend API base URL (default: `/api` — same origin via Vite proxy) |

> `ADMIN_USERNAME` and `ADMIN_PASSWORD` are consumed by the PostgreSQL container at database initialization. The password is hashed using bcrypt (`pgcrypto`) and stored in `admin_users` — the plaintext is never persisted.

## RSVP Guest Count Rules

The `/api/rsvp` endpoint enforces the following rules on the `guests` field:

| RSVP status | Allowed guest count |
|---|---|
| `yes` (attending) | 1 or more |
| `no` (not attending) | 0 or more |

Passing a non-integer or a negative number returns `400`. Passing `guests: 0` with `rsvp: "yes"` returns `400` with `"Attending guests must be at least 1"`.

## Guest CSV Import

The admin panel supports bulk guest import via CSV. Download the sample from `public/sample-guests.csv`. Expected columns:

```
name, email, phone, address, rsvp, plusOne
```

Import mode options:
- **Merge** — Upserts guests by email (existing records updated)
- **Replace** — Clears the entire guest list before importing
