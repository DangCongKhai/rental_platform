<!-- rentos-task: RENT-020 -->
# RENT-020 · F6 · Tenancy renewal from request to confirmed extension (T05, T06, M15, T04)

**Flow:** Tenant ↔ owner shared flows (Tenant + owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 2.5 days (tentative)

## Outcome
On T05 the tenant opens the renewal dialog (T06) with a new end date and proposed rent; T05 shows “Đang chờ chủ nhà” and allows withdrawal. On M15 the owner rejects with a reason or proposes a renewal contract that starts the day after the current end; the extra dates are held, the tenant confirms on T04, and T05 shows “Đã gia hạn” with the future rent.

## References
- **FR68** Submit one pending renewal request · P0 Must (all ACs): FR68-AC01, FR68-AC02, FR68-AC03, FR68-AC04
- **FR69** Withdraw or reject pending renewal request · P0 Must (all ACs): FR69-AC01, FR69-AC02, FR69-AC03, FR69-AC04
- **FR70** Propose renewal as new immutable version · P0 Must (all ACs): FR70-AC01, FR70-AC02, FR70-AC03, FR70-AC04, FR70-AC05, FR70-AC06
- **FR84** Reserve renewal extension without releasing current occupancy · P0 Must (all ACs): FR84-AC01, FR84-AC02, FR84-AC03, FR84-AC04
- **FR81** Confirm the exact contract version mutually · P0 Must: FR81-AC06
- **FR33** Enforce nonoverlapping unit rental periods · P0 Must: FR33-AC04
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F6 Renewal; screens `T05-Tenancy`, `M15-Renewal`, `T04-Review`
- Modules: [M07](../../../docs/03-modules/M07-renewals/prd.md), [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md)
- Workflows: [WF-12](../../../docs/04-workflows/WF-12-request-renewal.md), [WF-13](../../../docs/04-workflows/WF-13-propose-renewal.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Renewal request/withdraw/reject/propose actions, renewal branch of `confirmContract`, T06 dialog, M15 page, T05 renewal states.

**Not in scope:** Changing terms in the middle of a confirmed contract (deferred).

## Implementation checklist
- [ ] One PENDING renewal per tenancy; a request alone changes no dates
- [ ] Withdraw/reject: if a renewal contract is pending, drop it and shrink blocked dates back to confirmed dates
- [ ] Propose: start = confirmed end + 1 day, later end; new RENEWAL version with owner confirmation; extend blocked end date (database rejects overlaps)
- [ ] Tenant confirm: request ACCEPTED and confirmed end extended together; the new rent applies only from the renewal start
- [ ] Notify the other side at each step

## API and data contract
Server Actions `requestRenewal(tenancyId, {end_date, rent, message})`, `withdrawRenewal`, `rejectRenewal(id, reason)`, `proposeRenewal(id, input)`; confirmation reuses `confirmContract`.

## Acceptance criteria
- [ ] Request through December → PENDING; current dates unchanged
- [ ] Jan–Jun confirmed, Jul–Dec at 4.2m proposed → extension held, current rent unchanged
- [ ] Gap or overlap with the current contract → field error; another tenant cannot book Jul–Dec meanwhile
- [ ] Withdraw frees only the extension
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests for renewal vs another booking, withdraw vs confirm.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-002 · Database schema, integrity constraints, notifications helper and seed data (Khai)
- RENT-008 · Tenant home and rental request tracking (T01, T02, T03) (Khai)
- RENT-013 · Owner rental request inbox (M10, M11) (Kien)
- Note: Build request, withdraw, reject and propose against the seeded CONFIRMED tenancies. Only the final step (tenant confirms the renewal via `confirmContract`) waits for RENT-017.

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: critical · Estimate: 2.5 days (revise after starting)
- Labels: flow:shared, module:M07, module:M06, priority:P0, risk:critical, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-020-tenancy-renewal` into `develop` references this issue and is approved by the reviewer
