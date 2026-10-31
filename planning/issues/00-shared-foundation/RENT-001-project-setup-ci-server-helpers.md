<!-- rentos-task: RENT-001 -->

# RENT-001 · Project setup: CI, test runner and server access helpers

**Flow:** Shared foundation (Everyone)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1 day (tentative)

## Outcome

Both members can write a server-side mutation that knows who the user is, checks they own the record (or are an admin), validates input and returns field errors, and every PR is checked by CI.

## References

- **FR05** Resource and admin authorization · P0 Must (all ACs): FR05-AC01, FR05-AC02, FR05-AC03, FR05-AC04
- **FR43** Verify the Supabase session on the server · P0 Must (all ACs): FR43-AC01, FR43-AC02, FR43-AC03
- **FR75** Transactional consistency · P0 Must: FR75-AC02
- Modules: [M01](../../../docs/03-modules/M01-identity-access/prd.md), [M10](../../../docs/03-modules/M10-operations-delivery/prd.md)
- Workflows: [WF-28](../../../docs/04-workflows/WF-28-authenticate-profile.md)

## Current repository evidence

- `src/lib/auth/current-user.ts` reads `supabase.auth.getClaims()` for the navbar only; no reusable access checks.
- No `.github/workflows/`, no test runner, no test files.

## Scope and non-goals

**In scope:** Conventions for mutations (Next.js Server Actions; read `node_modules/next/dist/docs` first), `src/server/auth.ts` helpers, Zod validation helper, Vitest + one integration helper against local Supabase Postgres, GitHub Actions, labels, publishing the planned issues.

**Not in scope:** Custom JWT/JWKS verification, idempotency keys, audit/outbox kernel, OpenAPI. These were in the copied docs and are intentionally dropped.

## Implementation checklist

- [ ] `requireUser()`: `getClaims()` → profile by `user_id`; redirect/401 when signed out; block disabled `account_status`
- [ ] `requireAdmin()` from `user_profiles.is_admin` (server data only); `requireOwner(propertyId)`; `requireParty(tenancyId)`
- [ ] Never read `user_id`, `owner_id` or `is_admin` from form input
- [ ] `parseForm(schema, formData)` returning field errors in Vietnamese; shared `ActionResult` type `{ ok } | { error, fieldErrors }`
- [ ] Mutations are Server Actions (built-in same-origin check covers CSRF); Route Handlers are only for optional Supabase Cron/Webhook calls and must check `Authorization: Bearer <CRON_SECRET>`
- [ ] Vitest projects (`jsdom` components, `node` server) and a DB helper that runs each test in a rolled-back transaction
- [ ] GitHub Actions: install, `prisma migrate deploy` on a Postgres service, lint, typecheck, test, build
- [ ] Create `flow:*`, `area:*`, `risk:*` labels and one milestone per flow; publish `planning/issues` with `gh issue create --body-file`

## API and data contract

Helpers in `src/server/auth.ts` and `src/server/validation.ts`; documented in a short `src/server/README.md`.

## Acceptance criteria

- [ ] Signed-out user calling a protected action is redirected/refused
- [ ] Owner B calling an action on Owner A's property gets “not found” and nothing changes
- [ ] Normal user calling an admin action is refused
- [ ] A PR with a failing test cannot merge
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Unit tests for the helpers with a mocked Supabase client; one integration test proving the DB helper rolls back.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- None

## Ownership and review

- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: medium · Estimate: 1 day (revise after starting)
- Labels: flow:foundation, module:M01, module:M10, priority:P0, risk:medium, area:devops, area:security

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-001-project-setup-ci-server-helpers` into `develop` references this issue and is approved by the reviewer
