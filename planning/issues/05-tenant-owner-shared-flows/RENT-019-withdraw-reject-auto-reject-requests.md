<!-- rentos-task: RENT-019 -->
# RENT-019 · F8 · Tenant withdraws, owner rejects, and 15-day-old requests auto-reject (T02, T03, M11)

**Flow:** Tenant ↔ owner shared flows (Tenant + owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1.5 days (tentative)

## Outcome
The tenant withdraws a pending request (optional reason) and it moves to the closed tab while the owner sees that the tenant withdrew; the owner rejects a request with a reason and the tenant sees “Đã từ chối”; a request at least 15 days old is rejected automatically only if no unit can cover the whole requested period.

## References
- **FR28** Withdraw pending rental request · P0 Must (all ACs): FR28-AC01, FR28-AC02, FR28-AC03
- **FR31** Reject pending rental request · P0 Must (all ACs): FR31-AC01, FR31-AC02, FR31-AC03
- **FR85** Apply 15-day rejection using actual availability · P0 Must (all ACs): FR85-AC01, FR85-AC02, FR85-AC03, FR85-AC04, FR85-AC05, FR85-AC06, FR85-AC07, FR85-AC08
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F8 Withdraw and reject requests; screens `T03-Request`, `T02-Requests`, `M11-RequestDetail`
- Modules: [M05](../../../docs/03-modules/M05-rental-requests/prd.md)
- Workflows: [WF-08](../../../docs/04-workflows/WF-08-discuss-reject-enquiry.md), [WF-24](../../../docs/04-workflows/WF-24-withdraw-enquiry.md), [WF-15](../../../docs/04-workflows/WF-15-auto-reject-enquiries.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Withdraw and reject actions and dialogs on T03, T02 and M11; `evaluateStaleRequests` run lazily when the owner inbox or tenant request pages load, using RENT-003's availability query.

**Not in scope:** A deployed scheduler. Evaluation is lazy; fallback only if needed: a Supabase Cron job POSTs to a protected `/api/cron/stale-requests` Route Handler that calls `evaluateStaleRequests`.

## Implementation checklist
- [ ] Withdraw only while PENDING; if a proposal was just created, show “Đã chấp nhận” instead; notify owner
- [ ] Reject needs a reason; only while PENDING; notify tenant
- [ ] `evaluateStaleRequests(propertyIds)`: for PENDING requests ≥ 15 days old, release expired holds, check every unit (not just the preferred one), ignore whether the listing is hidden; reject with reason NO_AVAILABLE_UNIT and notify once

## API and data contract
Server Actions `withdrawRequest(id, reason?)`, `rejectRequest(id, reason)`; server function `evaluateStaleRequests`.

## Acceptance criteria
- [ ] Withdraw and proposal at the same time → only one wins
- [ ] Blank reject reason → field error
- [ ] 14 days 23:59 old → untouched; ≥ 15 days with nothing free → rejected once
- [ ] Preferred unit taken but another fits → stays PENDING
- [ ] Hidden listing with a free unit → stays PENDING
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests with a controllable clock and seeded old requests. Add the withdraw-vs-proposal race test once RENT-017 merges.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-008 · Tenant home and rental request tracking (T01, T02, T03) (Khai)
- RENT-013 · Owner rental request inbox (M10, M11) (Kien)
- Note: Withdraw, reject and auto-reject do not need contracts. Only the “withdraw at the same moment a proposal is created” test waits for RENT-017; add it when that merges.

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:shared, module:M05, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-019-withdraw-reject-auto-reject-requests` into `develop` references this issue and is approved by the reviewer
