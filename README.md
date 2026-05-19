# and-ai-nextjs

A Next.js + Supabase starter template for building authenticated web apps. Auth, database, TypeScript types, and Vercel CI/CD are wired up out of the box.

## Stack

- **Next.js 16** — App Router, TypeScript, server components by default
- **React 19**
- **Supabase** — Postgres, email/password auth, Row Level Security
- **Tailwind CSS 4**
- **Vercel** — hosting via GitHub Actions CI/CD (not Vercel's built-in auto-deploy)
- **`@supabase/ssr`** — cookie-based session management

## Project structure

```
app/
  auth/             # Login, signup, email confirmation, auth server actions
  dashboard/        # Example protected page with server actions
lib/
  supabase/
    client.ts       # Browser Supabase client
    server.ts       # Server Supabase client (RSC, actions)
    proxy.ts        # Session refresh helper for proxy.ts
  database.types.ts # GENERATED — do not edit by hand
  database.helpers.ts  # Type aliases (Profile, Note, etc.)
  env.ts            # Validated env vars with startup errors
proxy.ts            # Next.js proxy: session refresh + auth gating
scripts/
  gen-types-remote.mjs  # Regenerates TS types from hosted Supabase
supabase/
  migrations/       # SQL migrations, ordered by timestamp
```

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your Supabase project values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page (`sb_publishable_*`) |
| `SUPABASE_SECRET_KEY` | Same page (`sb_secret_*`) — server only, never expose |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

### 3. Push the database schema

```bash
npm run db:login   # authenticate with Supabase CLI
npm run db:link    # link to your hosted project
npm run db:setup   # push migrations to Supabase
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Common commands

```bash
npm run dev                  # start dev server on :3000
npm run build                # production build
npm run lint                 # ESLint

# Database
npm run db:login             # authenticate Supabase CLI
npm run db:link              # link to hosted Supabase project
npm run db:setup             # push pending migrations
npm run types:generate       # regenerate TypeScript types from schema

# Vercel
npm run vercel:login         # authenticate Vercel CLI
npm run vercel:link          # link to Vercel project (generates IDs for CI)
npm run vercel:deploy        # deploy preview
npm run vercel:deploy:prod   # deploy to production

# AI coding assistants
npm run claude               # Claude Code CLI
npm run gemini               # Gemini CLI
```

## Adding schema changes

1. Create a new migration: `npx supabase migration new <name>`
2. Write your SQL (see `supabase/migrations/20260512000000_init.sql` for patterns)
3. Enable RLS and add policies on every new table
4. Push: `npm run db:setup`
5. Regenerate types: `npm run types:generate`

## Deploying to Vercel

Deploys run through GitHub Actions (`.github/workflows/`), not Vercel's built-in GitHub integration. Disable the Vercel auto-deploy in your project's Git settings to avoid double-builds.

### GitHub secrets required

Add these in **Settings → Secrets and variables → Actions** on your GitHub repo:

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — create a token scoped to your project |
| `VERCEL_ORG_ID` | Run `npm run vercel:link` locally, then read `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file as above |

Add `.vercel` to `.gitignore` — it shouldn't be committed:

```bash
echo ".vercel" >> .gitignore
```

### Initial deploy checklist

1. Import your GitHub repo into Vercel via the dashboard (creates the project)
2. Disable Vercel's auto-deploy from GitHub in project Git settings
3. Set your env vars in the Vercel dashboard (Production + Preview as needed)
4. Run `npm run vercel:link` locally to get the IDs
5. Add the three secrets to GitHub
6. Open a PR to test the preview workflow, merge to test production
