# MoHR Backend: API Reference

The backend is a Next.js app serving only API routes on port 3001. The browser never calls it directly: the frontend's `/api/*` routes forward requests with the user's NextAuth session cookie. See the [README](../README.md) for setup and the overall security model.

## Conventions

- **Authentication.** Every route except `POST /api/auth/login` and `POST /api/auth/register` calls `withAuth()` (`lib/rbac.ts`). It decodes the session cookie and reloads the user from the database. Unknown, deactivated or signed-out users get `401`; a role that isn't allowed gets `403`.
- **Roles.** `ADMIN`, `MANAGER`, `EMPLOYEE`. "Any" below means any signed-in, active user.
- **Errors.** Every error body is `{ "error": "<message>" }`, plus `"field"` for validation errors. Messages are safe to show to users. Status codes used: `400` invalid input, `401`, `403`, `404`, `409` conflict, `413` body too large, `429` rate limited (with `Retry-After`), `500` unexpected.
- **Dates.** Calendar dates are `YYYY-MM-DD`. Times of day (`HH:MM`) and "today" are in the company timezone (`Settings.timezone`, see `lib/dates.ts`). Timestamps are ISO-8601 UTC.
- **Validation.** JSON bodies are parsed with zod via `parseJson()` (`lib/validation.ts`); unknown keys are ignored.

## Auth

| Method & path | Access | Body → Response |
|---|---|---|
| `POST /api/auth/login` | Public (called by the frontend's NextAuth `authorize()`) | `{ email, password }` → user profile. Every failure returns `401 "Invalid credentials"` (unknown email, wrong password and deactivated account look the same). Locked for 15 min after 5 failures per email → `429`. |
| `POST /api/auth/register` | Public | `{ email, password, firstName, lastName, position?, department?, phone? }` → `201 { user }`. Always creates an `EMPLOYEE`, with an employee record and leave balance. Email taken (case-insensitive) → `409`. |

Password policy (`passwordSchema`): 8–72 characters, at least one letter and one number. Emails are stored trimmed and lower-cased.

## Current user

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/users/profile` | Any | Own profile |
| `PUT /api/users/profile` | Any | `{ firstName, lastName, phone, department }`. Full update; blank `phone`/`department` clears it. |
| `PUT /api/users/password` | Any | `{ currentPassword, newPassword }`. Wrong current password → `400`; 5 wrong attempts per 15 min → `429`. |
| `POST /api/users/avatar` | Any | Multipart `avatar`: JPEG/PNG/WebP (checked by content), ≤ 5 MB, ≤ 4000 px. Stored resized to 200×200 JPEG → `{ avatar: "/api/files/avatars/<uuid>.jpg" }` |
| `DELETE /api/users/avatar` | Any | Removes the avatar |

## User administration

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/users` | ADMIN | All users (no passwords) |
| `PUT /api/users` | ADMIN | `{ id, role?, active? }`. You can't change your own role or status, and the last active admin can't be removed (`400`). Deactivating also sets the employee's status to `INACTIVE`. |

Accounts are created with `POST /api/employees` and are never hard-deleted.

## Employees

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/employees` | ADMIN, MANAGER | All employees with user details and leave balance |
| `POST /api/employees` | ADMIN | `{ firstName, lastName, email, position, phone?, department?, hireDate? }` → `201 { id, employeeId, temporaryPassword }`. The temporary password is returned only once. |
| `GET /api/employees/:id` | Self, ADMIN, MANAGER | Employee + user + leave balance (others get `404`) |
| `PUT /api/employees/:id` | ADMIN | `{ firstName, lastName, email, phone, department, position, hireDate, status }`. `status: "INACTIVE"` also disables sign-in. |
| `DELETE /api/employees/:id` | ADMIN | Soft delete: status `INACTIVE` and sign-in disabled; history is kept |

Employee IDs (`EMP0001`, …) are the highest existing number + 1, generated under a Postgres advisory lock (`createEmployeeRecord()` in `lib/employee.ts`).

## Attendance

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/attendance?year=&month=` | Any (own records) | One month (default: current) → `{ today, month, todayRecord, records[] }`; each record includes `duration` in minutes |
| `POST /api/attendance/checkin` | Any | One record per day; after 09:30 company time the status is `LATE` |
| `POST /api/attendance/checkout` | Any | Requires today's check-in and at least 1 minute since it |

## Leave

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/leave?status=&page=&pageSize=&sort=&dir=` | Any (own requests); ADMIN/MANAGER see all | `{ items[], total, page, pageSize }`. `pageSize` ≤ 100 (default 25); `sort` ∈ `employeeName, leaveType, startDate, endDate, status, createdAt`. Items include `workingDays` and `isOwn`. |
| `POST /api/leave` | Any | Multipart: `leaveType`, `startDate`, `endDate`, `reason`, optional `attachment` (PDF/JPEG/PNG/WebP by content, ≤ 5 MB) |
| `GET /api/leave/balance` | Any | Own balance for the current year + pending count |
| `GET /api/leave/pending-count` | Any | Approvers: all pending; employees: own requests decided in the last 7 days |
| `PUT /api/leave/:id/approve` | ADMIN, MANAGER | `{ "status": "APPROVED" }` or `{ "status": "REJECTED", "rejectionReason": "…" }` |

**Leave rules**
- Types: `VACATION`, `SICK` and `PERSONAL` use the balance; `UNPAID` (and `MATERNITY`/`PATERNITY`) don't.
- Days are **working days** (Mon–Fri) between the dates, inclusive. Public holidays are not excluded.
- A request may start at most 30 days in the past, may span at most a year, can't fall entirely on a weekend, can't overlap your own pending or approved leave (`409`), and can't exceed the remaining balance.
- Only `PENDING` requests can be decided (otherwise `409`); you can't decide your own request (`403`). Approval re-checks and deducts the balance in one transaction, with the balance row locked.
- Balances: 20 vacation, 10 sick and 5 personal days per year. One row per employee; used days reset to 0 on first access in a new year (no carry-over).

## Rooms

| Method & path | Access | Body → Response |
|---|---|---|
| `GET /api/rooms` | Any | Rooms with `amenities[]`, `bookable`, `inUseNow` (other people's bookings are not included) |
| `POST /api/rooms` | ADMIN | `{ name, capacity, location, amenities?: string[] }`. Duplicate name → `409`. |
| `GET /api/rooms/availability?date=&startTime=&endTime=` | Any | Bookable rooms free for that slot |
| `POST /api/rooms/book` | Any | `{ roomId, date, startTime, endTime, purpose }`. Times are `HH:MM` company time; the booking must be in the future; overlap → `409` (checked under a per-room lock). |
| `GET /api/bookings` | Any | Own upcoming/in-progress bookings |

## Dashboard, reports, settings

| Method & path | Access | Response |
|---|---|---|
| `GET /api/dashboard/stats` | Any | `{ totalEmployees, presentToday, onLeaveToday, absentToday, pendingLeaves, myBookingsToday }`. `pendingLeaves` is company-wide for approvers and your own otherwise. |
| `GET /api/dashboard/attendance-summary?month=&year=` | ADMIN, MANAGER | Attendance counts by status for a month |
| `GET /api/dashboard/leave-summary` | ADMIN, MANAGER | Leave counts by status |
| `GET /api/reports?period=week\|month\|quarter\|year` | ADMIN, MANAGER | Metrics, departments, 5-working-day trend, leave stats |
| `GET /api/settings` | ADMIN | Settings row (created on first read) |
| `PUT /api/settings` | ADMIN | `{ companyName?, companyEmail?, companyAddress?, timezone? }` (IANA timezone). Security, notification and date-format fields exist in the schema but aren't implemented, so they can't be changed. |

## Files

| Method & path | Access | Response |
|---|---|---|
| `GET /api/files/avatars/<name>` | Any | Image |
| `GET /api/files/leave-attachments/<name>` | The requester, ADMIN, MANAGER (others `404`) | File, `Cache-Control: private, no-store` |

Files are stored in the database (`Upload` table, keyed by `<folder>/<name>`), so no persistent disk is needed. Names are random UUIDs, and file types are decided from the file's bytes.

## Library modules (`lib/`)

| Module | Purpose |
|---|---|
| `rbac.ts` | `withAuth(req, roles?)`, `isLastActiveAdmin()` |
| `employee.ts` | Employee creation/ID generation, leave balance (incl. yearly reset), balance helpers |
| `dates.ts` | Company timezone, wall-clock ↔ UTC conversion, working-day count, `@db.Date` helpers |
| `uploads.ts` | Private file storage (in the database), content-type detection |
| `validation.ts` | zod schemas (`emailSchema`, `passwordSchema`, …), `parseJson()`, `rejectIfTooLarge()` |
| `pagination.ts` | `parsePagination()`, `parseSortDirection()` |
| `rate-limit.ts` | In-memory sliding-window limiter (single instance only) |
| `auth.ts` | bcrypt hashing, temporary passwords |
| `prisma.ts` | Prisma client (Postgres adapter), cached across dev hot reloads |

## Scripts and tests

- `node scripts/make-admin.mjs <email>`: promote an account to admin (first-admin bootstrap).
- `npm test`: unit tests in `tests/` (dates/timezones, working days, file detection, validation, pagination, rate limiting).
- `npm run typecheck`: TypeScript check.
