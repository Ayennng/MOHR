# MOHR - Modern HR Management System

**MOHR (Modern HR)** is an HR management system for employee records, leave requests, attendance, meeting-room booking and reporting, built as two Next.js apps (a UI and an API) over PostgreSQL.

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

- The browser only talks to the **frontend**. Its `/api/*` routes are thin proxies (`frontend/lib/proxy.ts`) that forward the request with the user's **session cookie only**.
- The **backend** decodes that cookie itself (both apps share `NEXTAUTH_SECRET`) and **reloads the user from the database on every request** (`backend/lib/rbac.ts`). Deactivating someone or changing their role takes effect immediately.
- The backend never trusts identity headers. Only `/api/auth/login` and `/api/auth/register` are public.
- Uploaded files live in a private `backend/uploads/` folder and are served only through `/api/files/...` after an access check. Leave attachments are visible only to the requester, managers and admins.
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
# Optional: where uploads are stored (default: backend/uploads)
# UPLOADS_DIR="/var/lib/mohr/uploads"
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
│   ├── app/              # Pages (dashboard, attendance, leave, employees, rooms, reports, settings, profile)
│   │   └── api/          # Proxy routes to the backend (one-liners using lib/proxy.ts)
│   ├── components/       # UI library (components/ui) and feature components
│   ├── lib/              # NextAuth config (auth.ts), proxy helper, login rate limiter
│   └── proxy.ts          # Redirects signed-out visitors to /login
│
└── backend/
    ├── app/api/          # API routes (see backend/BACKEND_DOCUMENTATION.md)
    ├── lib/              # rbac (auth), employee, dates (timezone), uploads, validation, pagination, rate-limit
    ├── prisma/           # Schema and migrations
    ├── scripts/          # make-admin.mjs, migrate-uploads.mjs
    ├── tests/            # Vitest unit tests
    └── uploads/          # Private uploaded files (gitignored)
```

---

## 📜 Scripts

| | Frontend | Backend |
|---|---|---|
| `npm run dev` | Dev server on :3000 | Dev server on :3001 |
| `npm run build` / `start` | Production build / server | Production build / server on :3001 |
| `npm run lint` | ESLint | — |
| `npm run typecheck` | — | `tsc --noEmit` |
| `npm test` | — | Unit tests (Vitest) |

---

## 🚢 Deployment notes

- **Expose only the frontend.** Keep the backend on a private network: it enforces auth anyway, but it doesn't need to be public.
- **Uploads need persistent disk storage.** Point `UPLOADS_DIR` at a volume that survives redeploys. Serverless hosts with ephemeral filesystems (e.g. Vercel functions) will lose uploads.
- **Run one instance of each app.** Login rate limits are kept in memory per process. To run several instances, move them to a shared store such as Redis.
- **Set `X-Forwarded-For` at your reverse proxy** so the per-IP sign-in limit sees real client addresses.
- Use HTTPS for both `NEXTAUTH_URL`s in production.
- **Upgrading from a version that stored uploads in `backend/public/uploads`?** Run `node scripts/migrate-uploads.mjs` from `backend/` once.

---

## 📚 More documentation

- [Backend API reference](backend/BACKEND_DOCUMENTATION.md)

---

## 🐛 Troubleshooting

**Every API call returns 401 after signing in.** The two apps' `NEXTAUTH_SECRET` values differ, or one `NEXTAUTH_URL` is `https` and the other `http`.

**"Too many failed attempts".** Wait 15 minutes, or restart the apps (the limits are in memory).

**`npm run dev` hangs or reports "Can't resolve 'tailwindcss'".** `frontend/postcss.config.mjs` must keep its `base` setting; Turbopack's PostCSS worker runs from the repository root.

**Port already in use.** Stop the other process, or run `npm run dev -- -p <port>` (update `BACKEND_URL` if you move the backend).

---

## 📝 License

This project is private and proprietary.

**Built with ❤️ using Next.js and the Moss Growth philosophy 🌿**
