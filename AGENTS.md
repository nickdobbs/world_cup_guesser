# Project context for AI coding assistants

This file gives AI agents (Claude Code, Gemini Code Assist, Copilot, etc.)
the context they need to be productive in this codebase. Read this first
before suggesting or making changes.

<!-- BEGIN:nextjs-agent-rules -->

## ⚠️ This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure
may all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

<!-- END:nextjs-agent-rules -->

## What this is

A Next.js + Supabase template for building authenticated web applications.
Originally created as a hackathon starter — auth, database, types, and
deployment are wired up out of the box so projects built from this template
can focus on their actual product.

The template ships with an example schema (`profiles`, `notes`) that
demonstrates the patterns; real projects replace it.

## Stack

- **Next.js 16** with the App Router and TypeScript — note that this
  version has breaking changes from Next.js 14 and earlier (e.g.
  `middleware.ts` renamed to `proxy.ts`, `cookies()` and `searchParams`
  are now async). See the warning at the top of this file.
- **React 19** (function components with hooks, no class components)
- **Supabase** for Postgres database, auth (email/password only), Row Level
  Security
- **Tailwind CSS** (if applicable — confirm by checking `postcss.config.mjs` or `tailwind.config.ts`)
- **Vercel** for hosting, with GitHub Actions for CI/CD
- **`@supabase/ssr`** for cookie-based session management — NOT the older
  `@supabase/auth-helpers-nextjs`, which is deprecated

## Project structure

```
.
├── .github/workflows/     # CI: preview deploys, production deploys
├── scripts/               # Helper scripts (setup, type generation)
│   └── gen-types-remote.mjs  # Regenerates TS types from hosted Supabase
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── check-email/page.tsx
│   │   ├── callback/route.ts    # Email confirmation return URL
│   │   └── actions.ts            # Server actions for all auth flows
│   └── dashboard/
│       ├── page.tsx              # Example protected page
│       └── actions.ts            # Server actions for the dashboard
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client (RSC, actions)
│   │   └── middleware.ts         # Helper for proxy.ts session refresh
│   ├── database.types.ts         # GENERATED — do not edit by hand
│   ├── database.helpers.ts       # Type aliases (Profile, Note, etc.)
│   └── env.ts                    # Validated env vars with helpful errors
│   proxy.ts                      # Next.js proxy: session refresh, auth-gating
├── supabase/
│   └── migrations/                   # SQL migrations, ordered by timestamp
├── .env.example                      # Template for .env.local
├── package.json
├── tsconfig.json
└── vercel.json                       # Disables Vercel auto-deploy (CI handles it)
```

## How auth works (read carefully — this is layered)

Authentication has three layers of protection. Each must be considered
when adding features:

### Layer 1: Proxy (Next.js proxy.ts → updateSession)

Runs on every request. Refreshes the user's Supabase session cookie if
expired, then redirects unauthenticated users away from non-public routes.

Public path prefixes are listed in `lib/supabase/proxy.ts` as
`PUBLIC_PATHS`. Add new public routes there (e.g., a landing page).

**This is UX, not security.** It can be bypassed; do not rely on it as
your only gate.

### Layer 2: Server-side re-verification in protected routes

Every protected page and server action calls `supabase.auth.getUser()` at
the top to verify the session is valid. This revalidates the JWT against
Supabase's auth server, catching tampered cookies.

```typescript
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect("/auth/login?next=...");
```

**Every new protected route and every new server action must do this.**

### Layer 3: Row Level Security in Postgres

Every table has RLS enabled. Policies use `auth.uid()` to filter rows to
the current user. Even if layers 1 and 2 were bypassed, a user could not
read or write data they don't own — Postgres enforces this directly.

This is the security boundary that actually matters.

## How the database works

### Schema lives in migrations

All schema changes go through `supabase/migrations/`. To add or change schema:

```bash
npx supabase migration new <descriptive_name>
# edit the generated SQL file
npx supabase db push    # apply to hosted Supabase
npm run types:generate  # regenerate TypeScript types
```

Migrations are append-only in production. Never edit a migration that has
been applied to a real environment. For a template/hackathon project that
hasn't deployed yet, editing the init migration in place is fine.

### Every table must have RLS

New tables default to RLS _off_ in Postgres. The migration must enable it
and write at least one policy:

```sql
alter table public.your_table enable row level security;

create policy "Users can view their own rows"
  on public.your_table for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

A table with RLS enabled but no policies is **unreadable** to all
non-service-role users. That's a safe default but probably not what you
want — every new table needs at least a SELECT policy.

### Use the `(select auth.uid()) = ...` pattern

Wrap `auth.uid()` in a subquery for performance — Postgres caches the
result for the whole query rather than re-evaluating per row.

### Auth-linked tables use the profiles pattern

New rows in `auth.users` (created by signup) trigger `handle_new_user`,
which creates a matching `public.profiles` row. To extend the profile
schema, add columns to the migration and update the trigger if you want
new fields populated automatically.

### Reference tables vs user-owned tables

Two patterns appear in this codebase:

- **User-owned** (e.g. `notes`): row has `user_id`, RLS filters to current
  user, users can CRUD their own rows
- **Reference data** (e.g. fixtures, categories): publicly readable, only
  service_role can modify, seeded via migrations or admin scripts

Pick the pattern that matches your data. Don't make reference data
user-writable, and don't try to make user-owned data globally readable
without a deliberate policy.

## TypeScript types

Types are generated from the database schema by
`scripts/gen-types-remote.mjs`. The output is `lib/database.types.ts`.
**Never edit this file by hand** — it will be overwritten on the next
generation.

Consumer code imports from `lib/database.helpers.ts`, which exports
convenient aliases:

```typescript
import type { Profile, Note, NoteInsert } from "@/lib/database.helpers";
```

When adding new tables, add corresponding type exports to
`database.helpers.ts`.

Regenerate types after any schema change:

```bash
npm run types:generate
```

If types are stale, queries will return `any` and TypeScript won't catch
column mistakes.

## Environment variables

Required env vars are validated at startup in `lib/env.ts`. If a
required var is missing, the app fails fast with a helpful error message
pointing at `.env.local`.

To add a new env var:

1. Add to `.env.example` with a comment explaining what it's for
2. Add to `lib/env.ts`'s validation and exports
3. For browser-accessible vars, prefix with `NEXT_PUBLIC_` (will be
   inlined into the bundle)
4. For server-only secrets, NO `NEXT_PUBLIC_` prefix, accessed via
   `getServerEnv()` not the `env` object

**Never access `process.env[someVariable]` with a dynamic key.** Next.js's
build-time inlining only works on direct property access
(`process.env.NEXT_PUBLIC_X`). The dynamic version returns `undefined` in
the browser even when the var is set.

## Common commands

```bash
# Setup (first time only)
npm install

# Development
npm run dev                # start Next.js dev server on :3000

# Database
npx supabase migration new <name>    # create new migration file
npx supabase db push                  # apply pending migrations to hosted Supabase
npm run types:generate                # regenerate TypeScript types from schema

# Build/deploy
npm run build              # production build (also runs in CI)
npm run lint               # ESLint
```

## Conventions to follow

- **Server components by default.** Only use `'use client'` when needed
  (form interactivity, hooks like `useState`, browser APIs)
- **Server actions for mutations.** Forms post to server actions, not API
  routes. See `app/auth/actions.ts` and `app/dashboard/actions.ts`
  for examples
- **Every server action re-verifies auth at the top.** Don't skip this
  even when the action is "only rendered to logged-in users"
- **Redirect after server-action mutations.** Use `revalidatePath(...)`
  then `redirect(...)` to refresh data after writes
- **Open redirects are blocked.** The callback route and login flow
  validate any `next` parameter against `sanitizeNext()`. Don't bypass
  this
- **Errors from server actions are surfaced via `?error=` query params**
  on the redirect. The pages read `searchParams` to display them
- **Don't filter by `user_id` in queries when RLS already does it.** Let
  the database enforce ownership — it's the one place the filter
  definitely runs. Filtering in app code on top is duplication that can
  drift

## Footguns to avoid

- **Trusting Next.js patterns from your training data.** This version of
  Next.js has breaking changes from prior versions. When in doubt about
  Next.js APIs, file structure, or conventions, consult
  `node_modules/next/dist/docs/` rather than relying on memory.
- **Editing `database.types.ts` by hand.** It's regenerated; your changes
  will be lost.
- **Forgetting to enable RLS on a new table.** The migration runs, the
  table exists, but it's wide open. Always include
  `alter table ... enable row level security` and at least one policy.
- **Using `service_role` key in browser-accessible code.** This key
  bypasses RLS. It belongs only in server-only files (route handlers,
  server actions, scripts). Never prefix the env var with `NEXT_PUBLIC_`.
- **Reading session state from a server component, then trusting it for
  authorization.** Server components can read sessions but the trustworthy
  call is `supabase.auth.getUser()`, which revalidates with Supabase.
  `getSession()` reads the cookie but doesn't revalidate.
- **Inserting code between `createServerClient()` and `getUser()` in the
  proxy middleware.** Race conditions in cookie state lead to users
  randomly being logged out. Keep those two calls adjacent.
- **Replacing the `supabaseResponse` object in the proxy.** If you return
  a fresh `NextResponse.redirect()` without copying cookies from
  `supabaseResponse`, refreshed session tokens are lost and the user is
  logged out on the redirect.
- **Mixing `host.docker.internal` and `127.0.0.1` in your env vars.**
  Cookies are origin-scoped; switching hostnames mid-flow breaks sessions.
- **Building features that store secrets in client components.** Anything
  in a `'use client'` file ships to the browser. If a server action needs
  a secret, use `getServerEnv()` inside the action.

## When in doubt

Look at the existing `notes` implementation as a reference for any new
feature:

- `supabase/migrations/...init.sql` shows the table + RLS pattern
- `app/dashboard/page.tsx` shows the protected-route + query pattern
- `app/dashboard/actions.ts` shows the server-action pattern with
  auth re-verification

New features should mirror this structure. If you're tempted to do
something different (e.g., REST API routes instead of server actions,
client-side data fetching instead of server components), pause and check
if there's a reason — usually there isn't, and consistency with the
existing patterns is more valuable than the alternative.
