<!-- rentos-task: RENT-008 -->
# RENT-008 · Tenant home and rental request tracking (T01, T02, T03)

**Flow:** Tenant flow (Tenant)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1.5 days (tentative)

## Outcome
In “Trang của bạn” the tenant sees current rentals and actions needed, lists their requests in open/closed tabs, and opens a request to see the contact snapshot, dates, status and, once a proposal exists, the contract state.

## References
- **FR27** Tenant rental request dashboard · P0 Must (all ACs): FR27-AC01, FR27-AC02, FR27-AC03, FR27-AC04
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F1 Search and request, F8 Withdraw and reject requests; screens `T01-Dashboard`, `T02-Requests`, `T03-Request`, `BottomTabBar`, `Mob-T01`
- Modules: [M05](../../../docs/03-modules/M05-rental-requests/prd.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Tenant workspace layout (sidebar switch, mobile bottom tab bar), T01 dashboard, T02 list, T03 detail.

**Not in scope:** Withdraw (RENT-019), contract review (RENT-017).

## Implementation checklist
- [ ] Own requests only; open/closed tabs; pagination
- [ ] ACCEPTED shows the tenancy state (“Đang chờ bạn xác nhận hợp đồng”, “Đang chờ phiên bản sửa đổi”…)
- [ ] T01 cards for decisions waiting on the tenant and for active tenancies

## API and data contract
Server reads `getMyRentalRequests()`, `getMyRentalRequest(id)`, `getMyTenancies()`.

## Acceptance criteria
- [ ] Proposal created → request shows ACCEPTED plus “waiting for your confirmation”
- [ ] Owner phoning the tenant does not change the status
- [ ] Another tenant's request is not found
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration test for access scope; component tests for status badges and tabs.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-005 · Send a rental request from a listing (S03 → S06 → S04) (Khai)
- RENT-007 · Account: sign-in hardening, profile and notifications (S06, T07, T08) (Khai)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:tenant, module:M05, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-008-tenant-home-rental-requests` into `develop` references this issue and is approved by the reviewer
