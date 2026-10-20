# Local development

rentOS runs as a Next.js app and a local Supabase stack. Next.js serves the UI and the Route Handlers. Supabase supplies PostgreSQL, Auth, Storage, and Studio. The server reads and writes business data in that Postgres instance. The browser uses Supabase Auth and sends the access token to Route Handlers.

- [Supabase dashboard](https://supabase.com/dashboard) — create the project and copy its ref
- [Account access tokens](https://supabase.com/dashboard/account/tokens) — used by `supabase login`
- [CLI: link a hosted project](https://supabase.com/docs/reference/cli/supabase-link)
- [Local development](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Prerequisites

- Docker-compatible runtime. On macOS, [OrbStack](https://orbstack.dev/) or Docker Desktop. Start it before `supabase start`.
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). Homebrew: `brew install supabase/tap/supabase`.
- Node.js and npm.

## First-time setup

Create a project in the [Supabase dashboard](https://supabase.com/dashboard). The project ref is the id in the dashboard URL:

```text
https://supabase.com/dashboard/project/<project-ref>
```

It is also under Project Settings → General. From the repository root:

```bash
supabase init
supabase login
supabase link --project-ref <project-ref>
supabase start
supabase status
```

`supabase init` only creates `supabase/` and `config.toml`. It does not sign you in and does not attach a hosted project. `supabase login` asks for an access token from [account tokens](https://supabase.com/dashboard/account/tokens). `supabase link` stores that project ref locally and asks for the database password. Commit `supabase/`. The linked ref and the password stay out of git.

The first `supabase start` downloads images and can take several minutes. Later starts are faster. `supabase start` runs the stack on this machine. `supabase db pull` and `supabase db push` use the linked hosted project.

`supabase status` prints the URLs and keys for this machine. A single local project usually uses:

| Service | Default |
|---|---|
| API | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |

If those ports are taken, use the values `supabase status` prints.

Create `.env.local` in the repository root (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service role or secret key from supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

The anon / publishable key is the browser key. `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` stay in server code. Route Handlers use them for Storage and for SQL. The local database role is a direct login, so server policies remain the authorization boundary for product actions.

In `supabase/config.toml`, set the Auth site URL to the Next.js origin (`http://localhost:3000`) and allow that redirect, so confirmation and recovery links return to the app. Restart with `supabase stop` then `supabase start` after Auth config changes.

Install and run the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Route Handlers are part of the same process.

## Schema and jobs

Business tables, Storage bucket setup, and Auth-related SQL live in `supabase/migrations`. One person coordinates those files. Apply a changed branch with `supabase db reset` when you intend to rebuild local data, or with the migration command the CLI prints for an existing database.

Notification delivery uses a database-backed queue and a Next.js worker. Start that worker, and the scheduler, when those scripts are in the repo. They call the same server services as the Route Handlers.

## Daily flow

1. Start the container runtime.
2. From the repo root, run `supabase start`.
3. Apply schema changes when the branch added migrations.
4. Run `npm run dev`.
5. Start the queue worker and scheduler when the branch includes them.
6. Sign up or sign in through the app. Open the Mailpit URL from `supabase status` and use the confirmation link. Local Auth mail stays on your machine.
7. Inspect rows in Studio.
8. When you stop for the day, run `supabase stop`. That keeps the local database.

`supabase db reset` drops the local database and reapplies `supabase/migrations` plus `supabase/seed.sql`. Use it when you intend to rebuild local Supabase state.

## What stays local

Environment files (`.env`, `.env.local`) stay uncommitted. Studio, Mailpit, the local database password `postgres`, and the demo JWT material from `supabase status` are for this machine. The hosted database password and the access token from `supabase login` stay in local credential storage.
