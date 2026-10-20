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

Put the API URL, anon / publishable key and service role key from `supabase status` in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase status>
```

Keep the service role key on the server. Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Studio and the local mailbox (Mailpit) URLs are in `supabase status`. `supabase stop` shuts the stack down and keeps the local database.

Route Handlers run inside `npm run dev`. The server reads `DATABASE_URL` and the service role key from `.env.local`. Schema changes live in `supabase/migrations`. See the local development doc for the database URL, worker, and daily order.
