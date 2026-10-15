# MOHR — Bug & Weakness Fix Plan

Tracking file for the audit done on 2026-10-15. Tick items as they land.
Status: `[ ]` todo · `[~]` in progress · `[x]` done

**All five phases are complete (2026-10-15).** Remaining ideas are listed under "Not built" in the notes.

---

## Phase 1 — Authentication foundation (critical security)

The backend trusts `X-User-Id` / `X-User-Role` headers that any caller can forge.
Goal: the backend verifies identity itself on every request.

- [x] 1.1 Backend `lib/rbac.ts` `withAuth(req, roles?)` — decodes the NextAuth JWT from the
      forwarded cookie (same `NEXTAUTH_SECRET`), then **reloads the user from the DB** so deactivated
      users are rejected and role changes apply immediately (fixes stale-role-in-JWT).
- [x] 1.2 Every backend route uses `withAuth` (only `auth/login` and `auth/register` are public);
      all `X-User-*` header reads and raw `getToken` role checks removed.
- [x] 1.3 Frontend `lib/proxy.ts`: one `proxyToBackend()` helper that checks the session and forwards
      only the cookie. All `app/api/**` proxy routes are now 3-line wrappers. Added `api/employees/[id]`.
- [x] 1.4 Deleted the `attendance/delete-today` endpoint (frontend + backend).
- [x] 1.5 Deleted unused `lib/api-client.ts` (sent `X-User-*` from the browser) and the `axios` dependency.
- [x] 1.6 Removed dead backend auth code: `lib/middleware.ts`, `lib/nextauth.ts`, `api/auth/[...nextauth]`,
      `@next-auth/prisma-adapter` (profile/avatar routes switched to `withAuth`).
      Verified live: forged headers → 401; real session works end to end; deactivated user → 401 at once.

## Phase 2 — Things broken right now

- [x] 2.1 Leave balance year rollover → 500. `getLeaveBalance()` in `backend/lib/employee.ts` resets the
      row for a new year (one row per employee; no migration). Used days do **not** carry over.
      Verified live with a simulated 2025 row.
- [x] 2.2 Leave page / leave request page no longer crash when the balance request fails; leave submit shows the server's error.
- [x] 2.3 Both apps type-check clean and `next build` passes. Frontend NextAuth config typed properly;
      `useSession().update()` now refreshes name/avatar (display fields only, never id/role).
- [x] 2.4 Attendance page: checks `res.ok` (real error messages, no false "success"); month stats and
      "today" use the backend-provided company date; durations computed (were always 0) and shown as `Xh Ym`.
- [x] 2.5 Settings page: no endless spinner for non-admins.
- [x] 2.6 Uploads live in private `backend/uploads/` (gitignored), served by authenticated `/api/files/...`:
      attachments → requester + ADMIN/MANAGER only (others get 404), avatars → any signed-in user.
      Type detected from file bytes (PDF/JPEG/PNG/WebP only; DOC/DOCX dropped), random filenames.
      `backend/scripts/migrate-uploads.mjs` moved existing files and rewrote DB URLs — **run it once in every
      other environment**. 8 unreferenced files kept in `uploads/orphaned/` (not servable) — delete if unwanted.
      Avatar upload no longer deletes the old picture before the new one is safely saved.
- [x] 2.7 Rooms: real booking form + `api/rooms/book` proxy; admins get an "Add Room" form (there was no way to
      create rooms); rooms API returns amenities as an array, `bookable`/`inUseNow`, and no longer leaks other
      people's bookings. Old booking response included the booker's password hash — fixed.
- [x] 2.8 Edit employee page loads/saves real data via `api/employees/[id]`; the employee form now matches the
      DB (dropped fake salary/employment-type fields; department is free text with suggestions).
- [x] 2.9 Delete employee = **soft delete** ("Deactivate": status INACTIVE + login disabled, history kept).
      Add/Edit/Deactivate shown to admins only (matches backend). Admins can't deactivate themselves.
      Verified live: 45/45 end-to-end checks + all 11 pages render.

## Phase 3 — Business logic & data integrity

- [x] 3.1 Leave approval: only `PENDING → APPROVED|REJECTED` (409 otherwise), rejection needs a reason, no
      approving your own request (API 403 + UI hides buttons via `isOwn`), balance checked and charged in
      **working days** inside one transaction with the balance row locked. Verified: two simultaneous approvals
      that together exceed the balance → one succeeds, one refused. Leave list `?status=` validated.
- [x] 3.2 Leave creation validated (zod): type, dates (end ≥ start, ≤30 days back, ≤1 year span, not weekend-only),
      reason 10–1000 chars, no overlap with pending/approved leave (409), enough balance in **working days**
      (`countWorkingDays`, Mon–Fri; public holidays not excluded), attachment ≤5MB and real PDF/image.
- [x] 3.3 `ensureEmployee()` / `createEmployeeRecord()` in `backend/lib/employee.ts` (next ID = highest
      existing + 1, serialised with a Postgres advisory lock) replace all `count + 1` copies and the register loop.
- [x] 3.4 Company timezone (`backend/lib/dates.ts`, from `Settings.timezone`, **set to Asia/Kuala_Lumpur** per user)
      drives attendance "today", the 09:30 LATE cut-off, leave date checks and booking times. Settings dropdown
      lists real IANA zones; invalid zones rejected. Attendance API returns `{ today, records }`.
      Removed the redundant 1-minute check-in/out "cooldown" (one record per day is enforced by the DB).
- [x] 3.5 Dashboard stats: `absentToday` = active − checked in − on approved leave; pending leaves are the user's own
      for employees; "rooms booked" uses the company date (was UTC).
- [x] 3.6 Reports rewritten: attendance rate = check-ins ÷ (active employees × working days so far) — the old
      "present ÷ records" was always ~100%; LATE/HALF_DAY count as attended; trend = last 5 real weekdays with
      correct names; departments from active employees ("Unassigned" included); "Awaiting" (was really
      cancelled) renamed "Cancelled"; queries run in parallel; invalid `period` → 400; page handles errors.
- [x] 3.7 Room booking validated (room exists + bookable, start < end, future only); overlap check + insert
      under a per-room advisory lock, so concurrent overlapping bookings can't both succeed (409).
- [x] 3.8 Admin APIs. `/api/employees`: zod validation, department saved, soft delete, no self-deactivation.
      `/api/users`: **POST and DELETE removed** (accounts are created via Add Employee and deactivated, never
      hard-deleted); PUT only changes role/active, validated, no changing your own, can't remove the last active
      admin (`isLastActiveAdmin` lock, also used by employee edit/deactivate), keeps employee status in sync.
      Settings → Users now has a role selector and Deactivate/Reactivate (there was no way to make managers/admins).
- [x] 3.9 Emails trimmed + lower-cased on every write; login and duplicate checks are case-insensitive.
      Register form now sends the position it collects (it was dropped; department was used as job title).
- [x] 3.10 `password123` gone (random 16-char temp password shown once). `PUT /api/users/password` + "Change
      Password" form on the profile page. Shared password policy (8–72 chars, letter + number) on backend and
      the register form (form allowed 6 chars while the server required 8).
      Verified: 40/40 Phase 3 end-to-end checks.

## Phase 4 — Hardening

- [x] 4.1 Rate limiting (`lib/rate-limit.ts`, in-memory — **needs Redis or similar if either app runs as several
      instances**): backend locks an email for 15 min after 5 failed logins (even a correct password is refused
      meanwhile; success resets); change-password locks after 5 wrong current passwords; frontend `authorize()`
      allows 30 sign-in attempts per client IP per 15 min (IP from `X-Forwarded-For` — set it at your reverse proxy).
      Login form shows the lockout message and no longer shows the raw "CredentialsSignin" code. Unknown emails
      are checked against a dummy bcrypt hash so response timing doesn't reveal which accounts exist.
- [x] 4.2 Login returns the same "Invalid credentials" for unknown email, wrong password and inactive account;
      the password is checked before the active flag. Login input validated.
- [x] 4.3 Least privilege: `employees/[id]` = self or ADMIN/MANAGER; rooms list no longer returns bookings;
      `GET /api/employees` (phones + leave balances) is ADMIN/MANAGER only, matching the sidebar.
- [x] 4.4 Every JSON write endpoint validates with zod (`parseJson`); the two upload endpoints validate by hand.
      Profile update can now clear phone/department. Settings PUT accepts only implemented fields.
      `rooms/availability` validated (bad input was a 500). Uploads over the limit get 413 before the body is
      buffered (frontend proxy + backend leave/avatar routes).
- [x] 4.5 Debug `console.log`s removed (sidebar, dashboard, leave form); no API returns internal error text.
- [x] 4.6 Security (session timeout, 2FA, IP whitelist), notification and date-format settings were stored but never
      used — now shown read-only with a "Not available yet" note stating what actually applies (24h sessions,
      login lockout, no IP restriction, no notifications). The API ignores them. Building them is new feature work.
- [x] 4.7 Audit: backend 45 → 4, frontend 29 → 5. Removed unused backend deps (multer, nodemailer, react-dropzone
      + types). **Backend upgraded Next 14 → 16.4.1 + React 19** (dynamic route `params` are now awaited; `swcMinify`
      and `next lint` removed — use `npm run typecheck`). Frontend Next 16.1 → 16.4.1, next-auth 4.24.15 both,
      sharp 0.35.5. Remaining: backend 4 in the `prisma` **CLI** (dev tooling; npm's only "fix" is downgrading to
      Prisma 6), frontend 5 in the ESLint toolchain (fix would downgrade eslint-config-next to 14). Neither runs in
      the deployed app. Re-run `npm audit` periodically.
      Next 16.4 regression worked around: Turbopack failed on a `data:` URL in a Tailwind class → set inline;
      Tailwind also scanned `.next/` cache → `globals.css` now lists sources explicitly (`../app`, `../components`).
      Verified: Phase 2 suite 45/45, Phase 3 40/40, Phase 4 21/21 (after fixing 3 test-script mistakes), 13 pages render.

## Phase 5 — Cleanup & quality

- [x] 5.1 `lib/prisma.ts` creates the pg Pool only together with a new client (was a new pool per hot reload).
- [x] 5.2 Unbounded lists bounded: leave list is server-paged and server-sorted (`?page&pageSize≤100&sort&dir`,
      returns `{ items, total, page, pageSize }`; leave page uses the Pagination component, so sorting covers
      all requests, not one page). Attendance is month-by-month (‹ › month picker; `todayRecord` always returned;
      the old "Latest 30 days" label was wrong). Bookings list shows upcoming only. Employees/users are bounded
      by headcount and left unpaged.
- [x] 5.3 Vitest in backend (`npm test`): 31 unit tests for timezone conversion (incl. DST), working days,
      file-type detection, upload keys/traversal, validation schemas, pagination, rate limiter, employee helpers.
- [x] 5.4 README rewritten: accurate stack, security model, env vars (`BACKEND_URL`; removed unused SMTP /
      `NEXT_PUBLIC_API_URL`), **no published default passwords**, first-admin bootstrap via new
      `backend/scripts/make-admin.mjs <email>`, deployment notes (persistent uploads, single instance, XFF).
- [x] 5.5 `frontend/middleware.ts` → `proxy.ts` (matcher simplified to the one catch-all; verified redirect).
- [x] 5.6 `FRONTEND_SETUP.md` deleted (a dev log of the old insecure design; still in git history);
      `BACKEND_DOCUMENTATION.md` rewritten as an accurate API reference (endpoints, roles, rules, modules).
      Also: upload paths marked `turbopackIgnore` so builds don't trace the whole project into the server bundle.
      Verified: unit 31/31; e2e suites all pass apart from known test-script artifacts; 13 pages render.

---

## Notes / decisions
- Backend and frontend **must share `NEXTAUTH_SECRET`** and use the same cookie security setting
  (both http or both https) — the backend now reads the frontend's session cookie.
- The backend should not be exposed publicly; only the frontend talks to it. Auth is enforced anyway.
- Backend helpers: `lib/rbac.ts` (auth), `lib/employee.ts` (employee/leave balance), `lib/dates.ts` (timezone,
  working days), `lib/uploads.ts` (private files), `lib/validation.ts` (zod `parseJson`). Backend now depends on `zod`.
- Frontend dev fix: `postcss.config.mjs` pins Tailwind's `base` to the frontend folder. Without it, `next dev`
  hung on every page ("Can't resolve 'tailwindcss' in ...\MOHR") because Turbopack's PostCSS worker runs from
  the repo root. A stray empty `C:\Users\Ayen\package-lock.json` (2023) also makes Next.js pick the wrong
  workspace root (warning only); deleting it is safe if nothing else uses it.
- Not built (out of scope so far): employees cancelling their own pending leave (status CANCELLED exists but
  nothing sets it), cancelling room bookings, public holidays in working-day counts.
