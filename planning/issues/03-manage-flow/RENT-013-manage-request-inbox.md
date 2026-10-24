<!-- rentos-task: RENT-013 -->
# RENT-013 · Owner rental request inbox (M10, M11)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1 day (tentative)

## Outcome
The owner sees requests for their properties with the tenant's contact snapshot, dates and preferred unit, calls them offline, and from the request detail starts “Tạo đề xuất thuê”.

## References
- **FR29** Owner rental request inbox · P0 Must (all ACs): FR29-AC01, FR29-AC02, FR29-AC03, FR29-AC04
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F3 Request to contract, F8 Withdraw and reject requests; screens `M10-Inbox`, `M11-RequestDetail`, `Mob-M10`
- Modules: [M05](../../../docs/03-modules/M05-rental-requests/prd.md)
- Workflows: [WF-08](../../../docs/04-workflows/WF-08-discuss-reject-enquiry.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Inbox list and detail pages (mobile drawer).

**Not in scope:** Reject/withdraw (RENT-019), proposal (RENT-017).

## Implementation checklist
- [ ] Only requests for the owner's properties; filter by status and property
- [ ] Opening or calling never changes status
- [ ] Detail shows banners for withdrawn/rejected/accepted

## API and data contract
Server reads `getOwnerRequests(filters)`, `getOwnerRequest(id)`.

## Acceptance criteria
- [ ] Owner sees the phone number; nothing is reserved
- [ ] Another owner's request is not found
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration test for access scope.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-005 · Send a rental request from a listing (S03 → S06 → S04) (Khai)

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: medium · Estimate: 1 day (revise after starting)
- Labels: flow:manage, module:M05, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-013-manage-request-inbox` into `develop` references this issue and is approved by the reviewer
