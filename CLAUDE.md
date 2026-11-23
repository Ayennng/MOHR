# MOHR: rules for AI coding agents

HR system in two Next.js 16 apps. Read `README.md` (architecture, design decisions) before
a large change. `backend/BACKEND_DOCUMENTATION.md` documents every API route, and
`frontend/DESIGN.md` covers the UI.

## Layout

- `frontend/` (port 3000): App Router pages, NextAuth v4, React Hook Form + Zod, Tailwind 4.
- `backend/` (port 3001): API routes only, Prisma 7 + PostgreSQL, Zod, Vitest.
- The browser talks only to the frontend. `frontend/app/api/[...path]` proxies `/api/*` to the
  backend with the session cookie and nothing else.
- Next 16 differs from older versions you may know. Check `node_modules/next/dist/docs/` before
  using an API you are unsure of (see each app's `AGENTS.md`).

## Backend rules

- Every route except login/register starts with `withAuth(req, roles?)` from `lib/rbac.ts`
  and returns early if it gets a `NextResponse`. Never read identity from headers
  (`X-User-Id` and similar). They can be forged.
- Parse bodies with `parseJson(req, schema)` from `lib/validation.ts`, and reuse its shared
  schemas (`emailSchema`, `dateStringSchema`, ...) instead of writing new ones.
- Errors use `lib/http.ts`: `jsonError` for direct responses, `throw new ApiError(...)` inside
  transactions, `errorResponse(error, context)` in the catch. Every error is `{ error }`.
- Dates go through `lib/dates.ts`. "Today", the late cut-off and booking times follow the
  company timezone (`Settings.timezone`), not the server's.
- Employees are never deleted. Deactivate them (`INACTIVE`) instead.
- Schema changes need a Prisma migration in `backend/prisma/migrations`. Never edit an
  applied migration.

## Frontend rules

- Fetch with `api()` / `useApi()` from `lib/api.ts`. Don't add new proxy routes.
- Build pages from `components/ui` (Button, Field, Table, Modal, ...) before writing new markup.
- Use the theme tokens from `app/globals.css`, never raw hex values: `ink-*` for surfaces, borders
  and text, `mint-*` (the brand green) only where DESIGN.md allows it. Animate only `transform` and
  `opacity`. Full rules: `frontend/DESIGN.md`.
- TypeScript is strict: no `any`. Fix the type instead of casting around an error.

## Checking your work

- `npm run typecheck` in both apps, `npm run lint` in frontend, `npm test` in backend.
- To test against a database, use a scratch Postgres database loaded with
  `node scripts/reset-demo.mjs --yes`. Never point that script at a real or production
  database (Neon). It wipes everything.

## Working style

- Keep changes small and match the surrounding code. Don't add dependencies without asking.
- Don't commit `.env` files or secrets. Don't push or deploy unless asked: `main` deploys to Vercel.
