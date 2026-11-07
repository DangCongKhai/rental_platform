# Public, tenant, and contract commit ledger

Commands copied from the implementation plan for the user to run later. The agent did not stage, commit, or check out files.

Write the commands below to [planning/commits/2026-10-30-public-tenant-contract.md](planning/commits/2026-10-30-public-tenant-contract.md). They are for the user to run later. The agent must not run `git add`, `git commit`, or `git checkout`.

Each block is one branch, using the branch name already in the issue. Start each branch from the previous one so later work keeps the menu, date field, and notification inbox. Open the pull request into `develop` only for the first branch; later pull requests can target the previous feature branch until you merge in order. New files must be added first; `git commit -- path` alone skips untracked files.

```bash
git checkout -b fix/auth-login-return
git add -- .gitignore .cursor/rules/figma-design.mdc AGENTS.md src/lib/auth/safe-next.ts src/lib/auth/safe-next.test.ts src/app/auth/login/page.tsx src/components/auth/login-form.tsx src/components/auth/sign-up-form.tsx src/components/layout/navbar.tsx src/components/layout/guest-actions.tsx src/app/auth/sign-up/page.tsx
git commit -m "$(cat <<'EOF'
fix(auth): send signed-in users away from the login page

.gitignore
.cursor/rules/figma-design.mdc
AGENTS.md
src/lib/auth/safe-next.ts
src/lib/auth/safe-next.test.ts
src/app/auth/login/page.tsx
src/components/auth/login-form.tsx
src/components/auth/sign-up-form.tsx
src/components/layout/navbar.tsx
src/components/layout/guest-actions.tsx
src/app/auth/sign-up/page.tsx

EOF
)"
```

```bash
git checkout -b feat/rent-007-account-auth-profile-notifications
git add -- prisma/schema.prisma prisma/migrations prisma/seed.ts src/server/notifications.ts docs/07-architecture/data-dictionary.md docs/07-architecture/database-schema.mmd supabase/config.toml src/server/profile.ts src/server/profile.integration.test.ts src/server/notifications/inbox.ts src/server/notifications/inbox.integration.test.ts src/app/account/profile/page.tsx src/app/account/notifications/page.tsx src/components/account/profile-form.tsx src/components/account/notification-bell.tsx src/components/account/notification-bell.test.tsx src/components/layout/navbar.tsx src/components/layout/user-menu.tsx src/components/layout/owner-sidebar.tsx 'src/app/owner/[section]/page.tsx' src/lib/auth/current-user.ts src/server/README.md src/server/notifications.integration.test.ts src/server/account-test-fixtures.ts src/app/account/layout.tsx src/components/account/account-sidebar.tsx src/components/account/notification-list.tsx public/images/account src/components/auth/sign-up-form.tsx src/components/auth/neutral-auth-responses.test.tsx src/components/auth/forgot-password-form.tsx
git commit -m "$(cat <<'EOF'
feat(account): add profile edits and the notification inbox

prisma/schema.prisma
prisma/migrations
prisma/seed.ts
src/server/notifications.ts
docs/07-architecture/data-dictionary.md
docs/07-architecture/database-schema.mmd
supabase/config.toml
src/server/profile.ts
src/server/profile.integration.test.ts
src/server/notifications/inbox.ts
src/server/notifications/inbox.integration.test.ts
src/app/account/profile/page.tsx
src/app/account/notifications/page.tsx
src/components/account/profile-form.tsx
src/components/account/notification-bell.tsx
src/components/account/notification-bell.test.tsx
src/components/layout/navbar.tsx
src/components/layout/user-menu.tsx
src/components/layout/owner-sidebar.tsx
src/app/owner/[section]/page.tsx
src/lib/auth/current-user.ts
src/server/README.md
src/server/notifications.integration.test.ts
src/server/account-test-fixtures.ts
src/app/account/layout.tsx
src/components/account/account-sidebar.tsx
src/components/account/notification-list.tsx
public/images/account
src/components/auth/sign-up-form.tsx
src/components/auth/neutral-auth-responses.test.tsx
src/components/auth/forgot-password-form.tsx

EOF
)"
```

```bash
git checkout -b feat/rent-004-favourite-properties
git add -- src/server/favourites.ts src/server/favourites.integration.test.ts src/components/listings/favourite-button.tsx src/components/listings/favourite-button.test.tsx src/features/discovery/listing-card.tsx src/components/listings/listing-detail.tsx src/app/listings/saved/page.tsx src/app/listings/page.tsx 'src/app/listings/[id]/page.tsx' src/components/listings/saved-listings.tsx src/features/discovery/listings-api.ts src/server/listings/public-api.ts src/server/listings/public-listing.ts src/server/listings/search.ts src/server/listings/public-listing-fixture.ts public/images/listings/favourite-empty.svg public/images/listings/favourite-saved.svg
git commit -m "$(cat <<'EOF'
feat(favourites): save listings and list them privately

src/server/favourites.ts
src/server/favourites.integration.test.ts
src/components/listings/favourite-button.tsx
src/components/listings/favourite-button.test.tsx
src/features/discovery/listing-card.tsx
src/components/listings/listing-detail.tsx
src/app/listings/saved/page.tsx
src/app/listings/page.tsx
src/app/listings/[id]/page.tsx
src/components/listings/saved-listings.tsx
src/features/discovery/listings-api.ts
src/server/listings/public-api.ts
src/server/listings/public-listing.ts
src/server/listings/search.ts
src/server/listings/public-listing-fixture.ts
public/images/listings/favourite-empty.svg
public/images/listings/favourite-saved.svg

EOF
)"
```

```bash
git checkout -b feat/rent-005-send-rental-request
git add -- src/domain/requests/phone.ts src/domain/tenancies/calendar-months.ts src/domain/tenancies/calendar-months.test.ts src/components/ui/date-field.tsx src/components/ui/date-field.test.tsx src/server/requests/create-rental-request.ts src/server/requests/create-rental-request.integration.test.ts 'src/app/listings/[id]/request/page.tsx' src/components/listings/rental-request-form.tsx src/components/listings/rental-request-form.test.tsx src/components/listings/rental-request-dialog.tsx src/components/listings/listing-request-aside.tsx src/domain/requests/phone.test.ts src/domain/requests/request-input.ts src/components/listings/rental-request-screen.tsx src/features/discovery/listing-detail-screen.tsx src/components/listings/listing-detail.tsx 'src/app/listings/[id]/page.tsx'
git commit -m "$(cat <<'EOF'
feat(requests): submit one pending rental request from a listing

src/domain/requests/phone.ts
src/domain/tenancies/calendar-months.ts
src/domain/tenancies/calendar-months.test.ts
src/components/ui/date-field.tsx
src/components/ui/date-field.test.tsx
src/server/requests/create-rental-request.ts
src/server/requests/create-rental-request.integration.test.ts
src/app/listings/[id]/request/page.tsx
src/components/listings/rental-request-form.tsx
src/components/listings/rental-request-form.test.tsx
src/components/listings/rental-request-dialog.tsx
src/components/listings/listing-request-aside.tsx
src/domain/requests/phone.test.ts
src/domain/requests/request-input.ts
src/components/listings/rental-request-screen.tsx
src/features/discovery/listing-detail-screen.tsx
src/components/listings/listing-detail.tsx
src/app/listings/[id]/page.tsx

EOF
)"
```

The calendar-month helper is introduced here because the request form needs the 3-month rule. RENT-017 reuses the same file; do not add it again in that commit.

```bash
git checkout -b feat/rent-006-report-listing-track-outcome
git add -- prisma/schema.prisma prisma/migrations src/server/reports/report-listing.ts src/server/reports/report-listing.integration.test.ts src/app/account/reports/page.tsx src/components/listings/listing-report-dialog.tsx src/components/listings/listing-detail.tsx src/components/layout/user-menu.tsx prisma/seed.ts prisma/seed-data/listing-reports.ts src/components/account/report-history.tsx src/components/account/report-history.test.tsx src/components/listings/listing-report-dialog.test.tsx docs/07-architecture/data-dictionary.md docs/07-architecture/database-schema.mmd
git commit -m "$(cat <<'EOF'
feat(reports): let a signed-in user report a listing and read the outcome

prisma/schema.prisma
prisma/migrations
src/server/reports/report-listing.ts
src/server/reports/report-listing.integration.test.ts
src/app/account/reports/page.tsx
src/components/listings/listing-report-dialog.tsx
src/components/listings/listing-detail.tsx
src/components/layout/user-menu.tsx
prisma/seed.ts
prisma/seed-data/listing-reports.ts
src/components/account/report-history.tsx
src/components/account/report-history.test.tsx
src/components/listings/listing-report-dialog.test.tsx
docs/07-architecture/data-dictionary.md
docs/07-architecture/database-schema.mmd

EOF
)"
```

```bash
git checkout -b feat/rent-008-tenant-home-rental-requests
git add -- src/server/requests/my-requests.ts src/server/requests/my-requests.integration.test.ts src/app/tenant/layout.tsx src/app/tenant/page.tsx src/app/tenant/requests/page.tsx 'src/app/tenant/requests/[id]/page.tsx' src/components/tenant/tenant-nav.tsx src/components/tenant/request-status.test.tsx src/components/layout/user-menu.tsx
git commit -m "$(cat <<'EOF'
feat(tenant): show the tenant home and rental request history

src/server/requests/my-requests.ts
src/server/requests/my-requests.integration.test.ts
src/app/tenant/layout.tsx
src/app/tenant/page.tsx
src/app/tenant/requests/page.tsx
src/app/tenant/requests/[id]/page.tsx
src/components/tenant/tenant-nav.tsx
src/components/tenant/request-status.test.tsx
src/components/layout/user-menu.tsx

EOF
)"
```

```bash
git checkout -b feat/rent-017-contract-proposal-decline-revise
git add -- src/domain/tenancies/current-terms.ts src/domain/tenancies/current-terms.test.ts src/server/contracts/storage.ts src/server/tenancies/expiry.ts src/server/tenancies/actions.ts src/server/tenancies/actions.integration.test.ts src/server/tenancies/read.ts 'src/app/owner/requests/[id]/page.tsx' 'src/app/owner/requests/[id]/proposal/page.tsx' 'src/app/owner/tenancies/[id]/page.tsx' 'src/app/owner/tenancies/[id]/revise/page.tsx' 'src/app/tenant/tenancies/[id]/page.tsx' 'src/app/tenant/tenancies/[id]/review/page.tsx' 'src/app/tenant/requests/[id]/page.tsx' next.config.ts src/app/tenant/page.tsx src/components/tenancies/contract-form.tsx src/components/tenancies/contract-controls.tsx src/components/tenancies/tenancy-screen.tsx src/server/contracts/storage.test.ts
git commit -m "$(cat <<'EOF'
feat(tenancies): propose, confirm, decline, revise, and record move-in

src/domain/tenancies/current-terms.ts
src/domain/tenancies/current-terms.test.ts
src/server/contracts/storage.ts
src/server/tenancies/expiry.ts
src/server/tenancies/actions.ts
src/server/tenancies/actions.integration.test.ts
src/server/tenancies/read.ts
src/app/owner/requests/[id]/page.tsx
src/app/owner/requests/[id]/proposal/page.tsx
src/app/owner/tenancies/[id]/page.tsx
src/app/owner/tenancies/[id]/revise/page.tsx
src/app/tenant/tenancies/[id]/page.tsx
src/app/tenant/tenancies/[id]/review/page.tsx
src/app/tenant/requests/[id]/page.tsx

next.config.ts
src/app/tenant/page.tsx
src/components/tenancies/contract-form.tsx
src/components/tenancies/contract-controls.tsx
src/components/tenancies/tenancy-screen.tsx
src/server/contracts/storage.test.ts

EOF
)"
```

`expiry.ts` lands in this commit because the proposal must release due holds. The next commit adds the expired screens, countdown, and cron route.

```bash
git checkout -b feat/rent-018-confirmation-deadline-expiry
git add -- src/server/tenancies/expiry.ts src/server/tenancies/expiry.integration.test.ts src/server/tenancies/actions.ts src/app/api/cron/expire-holds/route.ts src/components/tenancies/confirmation-countdown.tsx 'src/app/tenant/tenancies/[id]/review/page.tsx' 'src/app/owner/tenancies/[id]/page.tsx' src/lib/supabase/proxy.ts src/lib/supabase/proxy.test.ts src/components/tenancies/confirmation-countdown.test.tsx src/components/tenancies/contract-controls.tsx src/components/tenancies/tenancy-screen.tsx
git commit -m "$(cat <<'EOF'
feat(tenancies): expire confirmation holds when the deadline passes

src/server/tenancies/expiry.ts
src/server/tenancies/expiry.integration.test.ts
src/server/tenancies/actions.ts
src/app/api/cron/expire-holds/route.ts
src/components/tenancies/confirmation-countdown.tsx
src/app/tenant/tenancies/[id]/review/page.tsx
src/app/owner/tenancies/[id]/page.tsx

src/lib/supabase/proxy.ts
src/lib/supabase/proxy.test.ts
src/components/tenancies/confirmation-countdown.test.tsx
src/components/tenancies/contract-controls.tsx
src/components/tenancies/tenancy-screen.tsx

EOF
)"
```

Leave `planning/commits/2026-10-30-public-tenant-contract.md` untracked unless you choose to commit it yourself. The agent does not commit it.
