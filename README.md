# MOHR - Modern HR Management System

**MOHR (Modern HR)** is an HR management system for employee records, leave requests, attendance, meeting-room booking and reporting, built as two Next.js apps (a UI and an API) over PostgreSQL.

[![CI](https://github.com/Ayennng/MOHR/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayennng/MOHR/actions/workflows/ci.yml)

**Live demo:** [mohr-hr.onrender.com](https://mohr-hr.onrender.com). Pick **Admin**, **Manager** or **Employee** on the login page to sign in to a sample company; the data resets every night. On weekdays from 08:00 to 22:00 Malaysia time it's kept awake; outside those hours the first visit takes about a minute.

**Theme**: Moss Growth 🌿 - a nature-inspired design for modern HR management.

---

## 🚀 Features

### 👤 Employee Management (admins)
- Employee directory (admins and managers)
- Add employees; each new account gets a one-time temporary password
- Edit employee details; deactivate instead of delete, so leave and attendance history is kept
- Change roles (Employee / Manager / Admin) and activate or deactivate accounts in **Settings → Users**

### 📅 Leave Management
- Request vacation, sick, personal or unpaid leave, with an optional PDF/image attachment
- Balances count **working days** (Mon–Fri) and reset each calendar year
- Overlapping requests and requests beyond the remaining balance are refused
- Managers and admins approve or reject (with a reason); nobody can approve their own request

### ⏰ Attendance
- Daily check-in / check-out; check-ins after 09:30 are marked late
- Month-by-month history with worked hours and monthly stats
- "Today" and the late cut-off follow the company timezone (**Settings → General**)

### 🏢 Room Booking
- Admins add rooms (capacity, location, amenities)
- Anyone can book a future time slot; overlapping bookings are refused

### 📊 Dashboard & Reports
- Headcount, absences, pending leave and today's bookings
- Reports (admins and managers): attendance rate, 5-day trend, departments and leave outcomes

---

## 🛠️ Tech Stack

| | Frontend (`frontend/`, port 3000) | Backend (`backend/`, port 3001) |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19 | Next.js 16 (API routes only) |
| Auth | NextAuth.js v4 (credentials, JWT sessions) | Verifies the NextAuth session cookie |
| Data | — | PostgreSQL + Prisma 7 |
| Validation | React Hook Form + Zod | Zod |
| Styling | Tailwind CSS 4, Lucide icons | — |
| Other | | bcryptjs, sharp (avatar resizing), Vitest |

---

## 🔒 How requests are secured

```
Browser ──► frontend (3000) ──► backend (3001) ──► PostgreSQL
            /api/* proxy routes   every route calls withAuth()
```

- The browser only talks to the **frontend**. A single catch-all route (`frontend/app/api/[...path]/route.ts`, using `lib/proxy.ts`) forwards each `/api/*` request to the same backend path with the user's **session cookie only**.
- The **backend** decodes that cookie itself (both apps share `NEXTAUTH_SECRET`) and **reloads the user from the database on every request** (`backend/lib/rbac.ts`). Deactivating someone or changing their role takes effect immediately.
- The backend never trusts identity headers. Only `/api/auth/login` and `/api/auth/register` are public.
- Uploaded files are stored in the database and served only through `/api/files/...` after an access check. Leave attachments are visible only to the requester, managers and admins.
- Failed sign-ins are rate-limited: 5 per email and 30 per client IP, per 15 minutes.

---

## 📋 Prerequisites

- **Node.js** 20 or newer
- **PostgreSQL** 15 or newer

---

## 🔧 Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment variables

`backend/.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mohr_db"
NEXTAUTH_SECRET="<same long random value as the frontend>"
NEXTAUTH_URL="http://localhost:3001"
```

`frontend/.env.local`:

```env
NEXTAUTH_SECRET="<same value as the backend>"
NEXTAUTH_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
```

Generate a secret with `openssl rand -base64 48`. **The two `NEXTAUTH_SECRET` values must match**, and both `NEXTAUTH_URL`s must use the same scheme (both `http` or both `https`). Otherwise the backend can't read the session cookie and every request returns 401.

### 3. Database

```bash
cd backend
npx prisma migrate deploy   # create the tables
npx prisma generate         # generate the Prisma client
```

### 4. Run

```bash
cd backend && npm run dev     # http://localhost:3001
cd frontend && npm run dev    # http://localhost:3000
```

### 5. Create the first admin

There are no built-in accounts. Register at <http://localhost:3000/register> (new accounts are always employees), then promote yourself:

```bash
cd backend
node scripts/make-admin.mjs you@example.com
```

Sign out and back in. From then on, manage roles in **Settings → Users** and set the company timezone in **Settings → General**.

---

## 📂 Project Structure

```
MOHR/
├── frontend/
│   ├── app/
│   │   ├── (app)/        # Signed-in pages sharing one layout (header + sidebar): dashboard, attendance,
│   │   │                 # leave, employees, rooms, reports, settings, profile. The group name isn't in the URL.
│   │   ├── (auth)/       # Login and register
│   │   └── api/          # NextAuth, register, health, and [...path]: the proxy to the backend
│   ├── components/       # UI kit (components/ui: buttons, cards, tables, fields, ...), shell, feature components
│   ├── lib/              # NextAuth config, proxy, api() + useApi() fetch helpers, formatting, sorting
│   └── proxy.ts          # Redirects signed-out visitors to /login
│
└── backend/
    ├── app/api/          # API routes (see backend/BACKEND_DOCUMENTATION.md)
    ├── lib/              # rbac (auth), http (errors), employee, leave, dates (timezone), uploads, validation, ...
    ├── prisma/           # Schema and migrations
    ├── scripts/          # make-admin.mjs, reset-demo.mjs (+ demo-data.mjs)
    └── tests/            # Vitest unit tests
```

---

## 📜 Scripts

| | Frontend | Backend |
|---|---|---|
| `npm run dev` | Dev server on :3000 | Dev server on :3001 |
| `npm run build` / `start` | Production build / server | Production build / server on :3001 |
| `npm run lint` | ESLint | — |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm test` | — | Unit tests (Vitest) |
| `node scripts/reset-demo.mjs --yes` | — | **Wipes the database** and loads the demo company |

---

## 🚢 Deployment notes

### Render

[`render.yaml`](render.yaml) runs both apps on Render's free plan in the Singapore region. The database lives elsewhere: [Neon](https://neon.tech)'s free Postgres works and, unlike Render's free database, doesn't expire after 30 days. Free services sleep after 15 minutes idle, so the first visit after that takes about a minute.

1. Create a Neon project (region: Singapore) and copy its connection string with **connection pooling turned off**.
2. In the Render Dashboard choose **Blueprints → New Blueprint Instance**, pick the repository and paste the connection string when asked for `DATABASE_URL`. Render generates the shared `NEXTAUTH_SECRET`, sets `BACKEND_URL` and `NEXTAUTH_URL`, and the backend build runs `prisma migrate deploy`.
3. Register at the frontend's `onrender.com` URL, then promote yourself from your own machine (free services have no shell): in `backend/`, run `DATABASE_URL="<neon connection string>" node scripts/make-admin.mjs you@example.com`.

After adding a custom domain, set the frontend's `NEXTAUTH_URL` to it.

**Keeping it awake.** Point a free uptime pinger (e.g. [cron-job.org](https://cron-job.org)) at the frontend's `/api/health` every 10 minutes. That route also calls the backend's `/api/health`, so one job keeps both services up; neither touches the database. Render gives a workspace 750 free instance hours a month, and two services awake around the clock would need about 1,490, so limit the pings to working hours: weekdays 08:00–22:00 Malaysia time uses about 650. Outside those hours the services sleep, and the login page wakes the backend in the background while the visitor types.

**Demo mode.** With `DEMO_MODE=true` on the frontend (set in `render.yaml`), the login page offers one-click sign-in to three shared accounts (`demo.admin`, `demo.manager` and `demo.employee` `@example.com`, password `Demo1234`). The API refuses password, profile and avatar changes for them, as well as role or status changes to them, so one visitor can't lock out the next. [`.github/workflows/reset-demo.yml`](.github/workflows/reset-demo.yml) wipes the database and reloads the sample company at 00:30 Malaysia time each night: add the Neon connection string as the `DEMO_DATABASE_URL` repository secret, then run the workflow once from the **Actions** tab. Only use this on a database that holds nothing but demo data. GitHub pauses scheduled workflows after 60 days without commits; re-enable it from the Actions tab if that happens. For a real company, leave `DEMO_MODE` unset and don't add the secret.

### Any host

- **Prefer exposing only the frontend.** The backend enforces auth on every route, but if your host has a private network, keep it there.
- **Uploads are stored in the database**, so the apps need no persistent disk.
- **Run one instance of each app.** Login rate limits are kept in memory per process. To run several instances, move them to a shared store such as Redis.
- **Set `X-Forwarded-For` at your reverse proxy** so the per-IP sign-in limit sees real client addresses.
- Use HTTPS for the frontend's `NEXTAUTH_URL` in production.

---

## 📚 More documentation

- [Backend API reference](backend/BACKEND_DOCUMENTATION.md)

## 🧭 Design decisions

- **Employees are never deleted.** Deactivating sets the employee `INACTIVE` and blocks sign-in; leave and attendance history stays.
- **Leave balances reset in place each year** (one row per employee, no carry-over). Days are counted Mon–Fri; public holidays aren't excluded.
- **The backend authenticates by decoding the frontend's NextAuth cookie** (shared `NEXTAUTH_SECRET`) and reloads the user from the database on every request.
- **One company timezone** (`Settings.timezone`) decides "today", the 09:30 late cut-off and booking times.
- **Not built yet:** employees cancelling their own pending leave (the `CANCELLED` status exists but nothing sets it), cancelling room bookings, public holidays, notifications, 2FA.

---

## 🐛 Troubleshooting

**Every API call returns 401 after signing in.** The two apps' `NEXTAUTH_SECRET` values differ.

**"Too many failed attempts".** Wait 15 minutes, or restart the apps (the limits are in memory).

**`npm run dev` hangs or reports "Can't resolve 'tailwindcss'".** `frontend/postcss.config.mjs` must keep its `base` setting; Turbopack's PostCSS worker runs from the repository root.

**Port already in use.** Stop the other process, or run `npm run dev -- -p <port>` (update `BACKEND_URL` if you move the backend).

---

## 📝 License

This project is private and proprietary.

**Built with ❤️ using Next.js and the Moss Growth philosophy 🌿**
