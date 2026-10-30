# Repository audit

Snapshot taken on 2026-10-24 before writing the backlog. It records what actually exists, so the issues don't recreate finished work or claim features that aren't there.

## Repository and workflow
| Item | Finding |
|---|---|
| Remote | `DangCongKhai/rental_platform`; default branch `develop`; `main` for releases |
| Collaborators | `DangCongKhai` (Khai) and `ndrhmdk` (likely Kien, **not confirmed**) |
| Pull requests | #1 `docs: add supabase local setup` (merged 2026-10-20), #2 `Add Prisma profiles, Supabase auth, and the home shell` (merged 2026-10-23) |
| Issues | None open or closed. Only GitHub's default labels; no milestones |
| CI | None. `.github/` holds only `PULL_REQUEST_TEMPLATE.md` |
| Tests | No test runner in `package.json` and no test files |
| Docs | `docs/` and `design/` were copied from another course and have been trimmed to this plan: 73 active requirements (8 marked `Removed`) and 287 acceptance cases; no worker, audit log, OpenAPI, logging, monitoring or caching requirements remain |
| Team size | Docs plan for four members (A–D). The real team is two: Khai owns the foundation, public & auth and tenant flows plus the contract and deadline-expiry flows; Kien owns the manage (owner) and admin flows plus the withdraw/reject and renewal flows |

## Stack as installed
Next.js 16.4.2 (App Router, `cacheComponents` and `partialPrefetching` on, `src/proxy.ts` instead of middleware), React 19.3, Tailwind 4, Prisma 7.10 with the `pg` adapter, `@supabase/supabase-js` and `@supabase/ssr`, `jose` (installed but unused). No TanStack Query yet.

## Status by module
| Module | Status | Evidence | Planned in |
|---|---|---|---|
| M01 Identity | **Partial** | Sign-up (with full name), confirm route, login (wrong-password and unconfirmed-email states), forgot/update password, logout from the account menu: `src/app/auth/*`, `src/components/auth/*`, `src/components/layout/user-menu.tsx`. Profile row created by the `on_auth_user_created` trigger in `prisma/migrations/20261023155000_user_profiles`. **Missing:** reusable server access checks, profile editing, tests, Auth redirect config | RENT-001, RENT-007 |
| M02 Inventory | Missing | Only `UserProfile` in `prisma/schema.prisma` | RENT-002, RENT-009–RENT-011 |
| M03 Listings | Missing | — | RENT-012, RENT-014, RENT-015 |
| M04 Discovery & favourites | **Browse UI** | Homepage `src/components/home/home-page.tsx`, browse in `src/features/discovery`, listing detail in `src/components/listings`. Favourites are not implemented | RENT-003, RENT-004 |
| M05 Enquiries | Missing | — | RENT-005, RENT-008, RENT-013, RENT-019 |
| M06 Tenancies | Missing | — | RENT-002, RENT-017, RENT-018, RENT-021 |
| M07 Renewals | Missing | — | RENT-020 |
| M08 Reports & admin | Missing | No `/admin` area | RENT-006, RENT-014–RENT-016 |
| M09 Notifications | Missing | No notifications table or inbox (planned as synchronous inserts) | RENT-002, RENT-007 |
| M10 Operations | Missing | No CI, tests or seed data | RENT-001, RENT-002 |

## Decisions and risks the backlog accounts for
1. **Cookie sessions instead of the docs' bearer-token API.** The app uses `@supabase/ssr` cookies, and `getClaims()` already verifies the session. Mutations are planned as Server Actions, which reject cross-origin requests, so no custom JWT or CSRF layer is planned (RENT-001).
2. **`supabase/` folder deleted.** Commit `4b52e78` removed `supabase/config.toml`. Auth site URL and redirect allowlist must be restored for confirmation and recovery links (RENT-007).
3. **The `user_profiles` trigger sets `full_name` to `'New user'`** when metadata is missing. Profile editing (RENT-007) lets users fix it.
4. **Static landing data.** `content.ts` listings, areas and FAQ are placeholders. Listings move to real data in RENT-003; areas and FAQ stay static copy.
5. **No background processes.** Expired 48-hour holds (RENT-018) and 15-day-old requests (RENT-019) are handled lazily when the record is opened or acted on, so any standard Next.js host works. Supabase `pg_cron` is the upgrade path if time-based processing is needed later.
6. **48-hour hold and favourite placeholder semantics** are proposed defaults in the docs, not confirmed by the product owner. Issues keep them configurable.
7. **Figma access.** The Figma file `rentOS-Design---MAIN` is on a Starter plan with a low MCP call limit. The Claude design prototype (`https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU`) was used as the UI reference; issues are grouped by its actor pages (S, T, M, A screens) and flows F1–F8.

## Not verified
- Whether local Supabase is running, and whether the `user_profiles` migration has been applied to the hosted project.
- Kien's GitHub handle and both members' remaining capacity and deadline. Estimates in the issues are tentative.
- No tests were run for this audit. All coverage figures in `coverage-validation.md` describe planned work only.
