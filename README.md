# **rentOS**

**A long-term rental platform for tenants, property owners, and administrators
in Da Nang, Vietnam.** rentOS brings property discovery, rental requests,
listing review, and tenancy management into one workflow.

![alt text](public/readme/homepage.png)

## **About rentOS**

rentOS supports long-term rentals by connecting tenants looking for a home
with owners managing rental properties. It supports the process from creating
a property and publishing a listing through rental requests, contracts, and
ongoing tenancy changes. Administrators review listings and investigate
reports.

The interface is primarily in Vietnamese and uses Da Nang locations in its
demo data. The project is actively developed; available workflows depend on
the current branch and database migrations.

## **Features**

### **For Tenants**

- Browse listings and filter by location, dates, and rental needs.
- View listing details, save favourites, and submit rental requests.
- Track requests, withdraw pending requests, and see owner decisions.
- Review tenancy details and contract history.
- Confirm a proposed tenancy, request a renewal, or submit an early-end or
  cancellation request when allowed by the tenancy state.
- Receive in-app notifications about rental activity.

### **For Property Owners**

- Create and edit properties with a guided setup flow.
- Generate units in bulk, edit each unit, and manage rent and operational
  status.
- Upload property and unit photos, reuse shared photos, and manage galleries.
- Create listing drafts, select advertised units and a cover, then submit
  listings for review.
- Publish approved listings, hide or archive them, and manage requests from
  prospective tenants.
- Propose contracts, manage move-in, process renewal requests, and review
  tenancy history.

### **For Administrators**

- View moderation and report activity from the admin dashboard.
- Review submitted listing packages and approve or reject them with a reason.
- Search listings, suspend them with a reason, and restore them.
- Investigate reports, resolve or dismiss them, and optionally suspend a
  listing during resolution.

## **Technology**

- **Language:** TypeScript
- **Web framework:** Next.js 16 App Router and React 19
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL, typically provided by Supabase
- **Authentication and file storage:** Supabase Auth and Supabase Storage
- **Database access and migrations:** Prisma 7 with the PostgreSQL adapter
- **Validation:** Zod
- **Testing:** Vitest, Testing Library, and database integration tests

## **Application Flow**

```mermaid
flowchart LR
  Tenant[Tenant] --> Browse[Browse listings]
  Browse --> Request[Rental request]
  Owner[Property owner] --> Setup[Property, units, and photos]
  Setup --> Listing[Create and submit listing]
  Listing --> Review[Admin review]
  Review --> Browse
  Request --> Inbox[Owner request inbox]
  Inbox --> Contract[Contract and tenancy]
  Contract --> Renewal[Renewal or early end]
  Admin[Administrator] --> Report[Reports and listing moderation]
```

Next.js renders the application and runs Server Actions and Route Handlers.
Supabase provides authentication, PostgreSQL, and private media storage.
Prisma migrations maintain the application schema and database constraints.

## **Getting Started**

### **Prerequisites**

- Node.js **20.9 or later** and npm.
- A Supabase project, either local or hosted.
- For local Supabase: Docker Desktop or another Docker-compatible runtime,
  plus the Supabase CLI. Setup guide:
  https://supabase.com/docs/guides/local-development/cli/getting-started

### 1. **Clone and Install**

```bash
git clone https://github.com/DangCongKhai/rental_platform.git
cd rental_platform
npm install
```

### 2. **Start Supabase Locally**

Start the Docker runtime, then run:

```bash
npx supabase start
npx supabase status
```

The repository already contains its Supabase configuration. `npx supabase status`
prints this machine's local URLs and keys. The local stack usually provides
PostgreSQL on port `54322`, the API on `54321`, and Studio on `54323`.

To use a hosted Supabase project instead, obtain the project URL and API keys
from its dashboard. Use the transaction-pooler connection for `DATABASE_URL`
and a direct or session connection for `DIRECT_URL`.

### 3. **Configure Environment Variables**

Copy the example file:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Set the values in `.env`. For local Supabase, use the values printed by
`supabase status`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
SUPABASE_SECRET_KEY=<local secret key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Keep `.env` out of version control. Never expose `SUPABASE_SECRET_KEY`,
`DATABASE_URL`, or `DIRECT_URL` through a `NEXT_PUBLIC_` variable.

### 4. **Migrations and Prisma Client**

With Supabase running and `.env` configured, run:

```bash
npx prisma migrate deploy
npx prisma generate
```

Prisma migrations are stored in `prisma/migrations`. `DIRECT_URL` is used by
Prisma Migrate; the application uses `DATABASE_URL` for database queries.

### 5. **Start the Application**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For local email
confirmation, open the Mailpit URL printed by `supabase status`.

## **Demo Data**

The optional seed creates demo accounts, Da Nang properties and units, photos,
listings in different moderation and publication states, rental requests,
tenancies, renewals, reports, favourites, and notifications.

**Only run the seed against a disposable development database.** It deletes
and recreates rows in its reserved demo ID range and removes seed notifications
before inserting the demo data.

```bash
npx prisma db seed
```

Seeded demo users share the local-only password `RentOS-demo-2026`:

| Role | Demo email |
| --- | --- |
| Administrator | `admin@rentos.local` |
| Owner | `linh@rentos.local` |
| Owner | `hao@rentos.local` |
| Tenant | `mai@rentos.local` |
| Tenant | `lan@rentos.local` |

The seed references the image library in `prisma/seed-data`. If those objects
are not already in Storage, set `SUPABASE_SERVICE_ROLE_KEY` in `.env` and run:

```bash
npx tsx prisma/upload-seed-media.ts
```

Never use demo credentials or demo data in a production environment.

## Common commands

- `npm run dev` — Start the development server.
- `npm run build` — Create an optimized production build.
- `npm run start` — Serve a production build.
- `npm run lint` — Run ESLint.
- `npm run typecheck` — Generate route types and run TypeScript.
- `npm test` — Run the Vitest suite.
- `npm test -- <file>` — Run a focused test file.
- `npx prisma migrate dev --name <change>` — Create and apply a local
  migration.
- `npx prisma migrate deploy` — Apply pending migrations.
- `npx prisma generate` — Generate the Prisma client.
- `npx prisma db seed` — Rebuild the reserved demo data.

Database integration tests require a migrated, isolated development/test
database configured through `.env`. They create and remove fixture records;
do not point them at production data.

## **Project Structure**

```text
src/app/                 Next.js routes and role-specific pages
src/components/          Shared UI components
src/domain/              Domain rules and validation
src/server/              Authentication, database, reads, and actions
prisma/schema.prisma     Prisma data model
prisma/migrations/       PostgreSQL schema migrations
prisma/seed.ts           Demo data seed
prisma/seed-data/        Da Nang places, sample media, and demo fixtures
docs/                    Requirements, architecture, workflows, and setup
supabase/                Local Supabase configuration
```