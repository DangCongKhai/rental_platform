<!-- rentos-task: RENT-022 -->

# RENT-022 · Owner overview dashboard (M01)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1 day (tentative)

## Outcome

“Tổng quan” shows the owner what needs attention: new requests, proposals waiting for the tenant, revisions to send, renewals to answer, units by status and listings by state, each linking to its screen.

## References

- No single FR; this issue supports the flows listed in its dependencies.
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `M01-Overview`
- Modules: [M02](../../../docs/03-modules/M02-property-units-media/prd.md), [M05](../../../docs/03-modules/M05-rental-requests/prd.md), [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md)

## Current repository evidence

- Not implemented; needs data from the other manage and shared flows.

## Scope and non-goals

**In scope:** Owner summary read and M01 page.

**Not in scope:** Revenue or payments.

## Implementation checklist

- [ ] One grouped query per section
- [ ] Empty state for new owners linking to the property wizard

## API and data contract

Server read `getOwnerOverview()`.

## Acceptance criteria

- [ ] Counts match seed data; each card links to the filtered list
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration test against seed data.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-019 · F8 · Tenant withdraws, owner rejects, and 15-day-old requests auto-reject (T02, T03, M11) (Kien)
- RENT-020 · F6 · Tenancy renewal from request to confirmed extension (T05, T06, M15, T04) (Kien)

## Ownership and review

- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: low · Estimate: 1 day (revise after starting)
- Labels: flow:manage, module:M02, module:M05, module:M06, risk:low, area:fullstack

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-022-manage-overview-dashboard` into `develop` references this issue and is approved by the reviewer
