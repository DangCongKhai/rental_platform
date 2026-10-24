# Local development

rentOS runs as a Next.js app and a local Supabase stack. Next.js serves the UI, server components and Server Actions. Supabase supplies PostgreSQL, Auth, Storage, and Studio. The server reads and writes business data in that Postgres instance. The browser signs in with Supabase Auth; `@supabase/ssr` keeps the session in cookies and server code verifies it.

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

Copy `.env.example` to `.env` in the repository root (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
SUPABASE_SECRET_KEY=<secret key from supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

The same names are in `.env.example`. The publishable key is the browser key. `SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `DIRECT_URL` stay in server code. Server code uses the secret key for Storage and `DATABASE_URL` for SQL. Prisma Migrate uses `DIRECT_URL`. On this local database those two URLs are the same direct connection. A hosted project uses the transaction pooler on port 6543 with `?pgbouncer=true` for `DATABASE_URL`, and the session or direct connection on port 5432 for `DIRECT_URL`. The local database role is a direct login, so server access checks remain the authorization boundary for product actions.

In `supabase/config.toml`, set the Auth site URL to the Next.js origin (`http://localhost:3000`) and allow that redirect, so confirmation and recovery links return to the app. Restart with `supabase stop` then `supabase start` after Auth config changes.

Install and run the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Server Actions run in the same process.

## Schema and jobs

Business tables live in `prisma/migrations`. You write `prisma/schema.prisma`, then `npx prisma migrate dev --name <change>` writes and applies the next migration. Triggers, functions, and the `user_profiles.user_id` foreign key to `auth.users` are SQL in that new migration file. One person coordinates those files. `npx prisma generate` refreshes the client. `DIRECT_URL` is the migration connection.

Notifications are inserted by each action in its own transaction, and time-based rules run lazily, so there is no worker or scheduler to start. If a Supabase Cron job or Database Webhook is added later, it calls a Route Handler in this same app (see `docs/07-architecture/api-design.md`).

## Daily flow

1. Start the container runtime.
2. From the repo root, run `supabase start`.
3. Apply schema changes with `npx prisma migrate dev` when the branch added a Prisma migration.
4. Run `npm run dev`.
5. Sign up or sign in through the app. Open the Mailpit URL from `supabase status` and use the confirmation link. Local Auth mail stays on your machine.
6. Inspect rows in Studio.
7. When you stop for the day, run `supabase stop`. That keeps the local database.

`supabase db reset` drops the local database and reapplies `supabase/migrations` plus `supabase/seed.sql`. It does not replay `prisma/migrations`. After a reset, apply the Prisma history with `npx prisma migrate deploy`.

## What stays local

Environment files (`.env`, `.env.local`) stay uncommitted. Studio, Mailpit, the local database password `postgres`, and the demo JWT material from `supabase status` are for this machine. The hosted database password and the access token from `supabase login` stay in local credential storage.
