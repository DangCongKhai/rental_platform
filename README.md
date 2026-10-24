# rentOS

A long-term rental management platform for Da Nang, Vietnam.

## Project Structure

- `src/` — source code
- `docs/` — PRD, requirements, architecture, workflows and testing
- `design/` — brand guidelines, UI/UX standards and screen specifications
- `.github/` — pull request templates and collaboration workflows
- `public/` — static assets
- `scripts/` — utility scripts
- `supabase/` — local Supabase config, created by `supabase init`
- `prisma/` — Prisma schema and SQL migrations
- `prisma.config.ts` — Prisma 7 config; migrations use `DIRECT_URL`
- `package.json` — dependencies and scripts
- `package-lock.json` — lock file
- `README.md` — this file
- `LICENSE` — license

## Stack

Next.js serves the UI and the server API. Local Supabase supplies PostgreSQL, Auth, Storage, and Studio. Full setup and the daily run order are in [docs/08-project/local-development.md](docs/08-project/local-development.md).

## Local setup

Install a Docker runtime and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase` on macOS). Create a project in the [Supabase dashboard](https://supabase.com/dashboard). The project ref is the id in `https://supabase.com/dashboard/project/<project-ref>`. Start Docker, then from this directory:

```bash
supabase init
supabase login
supabase link --project-ref <project-ref> # https://supabase.com/dashboard/project/<project-ref>
supabase start
supabase status
```

`supabase init` only creates the local `supabase/` folder. `supabase login` uses a token from [account tokens](https://supabase.com/dashboard/account/tokens). `supabase link` attaches this repo to that hosted project. Command reference: [`supabase link`](https://supabase.com/docs/reference/cli/supabase-link).

Copy [.env.example](.env.example) to `.env` and fill it from `supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
SUPABASE_SECRET_KEY=<secret key from supabase status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

`SUPABASE_SECRET_KEY` and both database URLs stay on the server. The publishable key is the browser key. Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Studio and the local mailbox (Mailpit) URLs are in `supabase status`. `supabase stop` shuts the stack down and keeps the local database.

## Prisma 7

The schema file [prisma/schema.prisma](prisma/schema.prisma) is written by hand. Prisma 7 reads [prisma.config.ts](prisma.config.ts). `DIRECT_URL` is the migration connection.

```bash
npx prisma migrate dev --name <change>
npx prisma generate
```

`migrate dev` writes a new folder under `prisma/migrations` and applies it. A trigger, a function, or the foreign key from `user_profiles.user_id` to `auth.users` is SQL added in that new migration file before it is applied. `generate` refreshes the client in `generated/prisma`.

Server Actions run inside `npm run dev`. Day-to-day Supabase commands are in [docs/08-project/local-development.md](docs/08-project/local-development.md).
