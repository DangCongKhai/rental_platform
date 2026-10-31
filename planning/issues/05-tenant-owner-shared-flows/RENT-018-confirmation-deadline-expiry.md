<!-- rentos-task: RENT-018 -->

# RENT-018 · Confirmation deadline expiry without background jobs (F5)

**Flow:** Tenant ↔ owner shared flows (Tenant + owner)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1 day (tentative)

## Outcome

When the 48-hour countdown on T04 reaches zero, the confirm button is disabled and the tenancy shows “Hết hạn” on M13 and T04; the dates become free for search and new proposals right away, and the request stays ACCEPTED in history. An expired renewal proposal falls back to the already confirmed dates.

## References

- **FR83** Expire temporary confirmation reservations · P0 Must (all ACs): FR83-AC01, FR83-AC03, FR83-AC04, FR83-AC05
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F5 Deadline expiry; screens `T04-Expired`, `M13-Tenancy`, `States-Conflicts`
- Modules: [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md)
- Workflows: [WF-14](../../../docs/04-workflows/WF-14-expire-reservation.md)

## Current repository evidence

- Not implemented.

## Scope and non-goals

**In scope:** `releaseExpiredHolds(unitIds)` and `isHoldExpired(tenancy)` helpers; calls from proposal, confirm, revise and renewal actions and from tenancy page loads; T04 expired state; M13 badge.

**Not in scope:** Workers or a deployed scheduler. Expiry is applied lazily when someone reads or acts on the record. Fallback only if holds must be released without anyone opening them: a Supabase Cron job (`pg_cron` + `pg_net`) POSTs to a protected `/api/cron/expire-holds` Route Handler that calls `releaseExpiredHolds` (see `docs/07-architecture/api-design.md`).

## Implementation checklist

- [ ] Confirm refuses at or after `confirmation_expires_at` (server time)
- [ ] `releaseExpiredHolds`: inside the caller's transaction, lock the tenancy, recheck it is still the same pending version and past deadline, then original → EXPIRED with blocked dates cleared, renewal → blocked dates back to confirmed dates
- [ ] Run it before inserting any new hold on a unit, and when a tenancy page loads
- [ ] Search already treats expired holds as free (RENT-003)
- [ ] Countdown component switches to the expired state at the deadline

## API and data contract

Server functions in `src/server/tenancies/expiry.ts`.

## Acceptance criteria

- [ ] Exactly at the deadline confirmation is refused
- [ ] Expired hold does not block a new proposal on the same dates
- [ ] Opening an expired tenancy shows “Hết hạn” and the request stays ACCEPTED
- [ ] Expired renewal keeps the original dates and rent
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests with a controllable clock: confirm at deadline, new proposal over an expired hold, renewal expiry.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-017 · Contract flow: proposal, confirmation, decline, revision and move-in (F3 + F4) (Khai)

## Ownership and review

- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: high · Estimate: 1 day (revise after starting)
- Labels: flow:shared, module:M06, priority:P0, risk:high, area:fullstack

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-018-confirmation-deadline-expiry` into `develop` references this issue and is approved by the reviewer
