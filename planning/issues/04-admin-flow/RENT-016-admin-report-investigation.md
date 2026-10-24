<!-- rentos-task: RENT-016 -->
# RENT-016 · Admin investigates reports and resolves, dismisses or suspends (A04, A05)

**Flow:** Admin flow (Admin)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1.5 days (tentative)

## Outcome
The admin works through the report list, opens a report, marks it “Đang xem xét”, and resolves it (optionally suspending the listing in the same step) or dismisses it, always with a reason; the reporter sees the outcome.

## References
- **FR39** Investigate reports and suspend listings · P0 Must (all ACs): FR39-AC01, FR39-AC02, FR39-AC03, FR39-AC04
- **FR78** Suspend and restore listings after reports or inspection · P0 Must: FR78-AC01, FR78-AC02
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F7 Report and suspension; screens `A04-Reports`, `A05-ReportDetail`
- Modules: [M08](../../../docs/03-modules/M08-reports-admin/prd.md)
- Workflows: [WF-17](../../../docs/04-workflows/WF-17-investigate-suspend.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Report list/detail pages and review/resolve/dismiss actions using RENT-015's suspend function.

**Not in scope:** Report submission (RENT-006).

## Implementation checklist
- [ ] List with status filter and pagination; detail with listing snapshot
- [ ] Resolve + optional suspend in one transaction; notify reporter and owner
- [ ] Reason required; a report already closed shows “already decided”

## API and data contract
Server Actions `startReview(id)`, `resolveReport(id, {summary, suspend})`, `dismissReport(id, reason)`.

## Acceptance criteria
- [ ] Resolve + suspend saves both together; listing leaves public pages
- [ ] Missing reason → field error
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration test for resolve + suspend in one transaction.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-006 · Report a listing and follow the outcome (S05, T09) (Khai)
- RENT-015 · Admin manages listings and suspends or restores them (A06) (Kien)

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:admin, module:M08, priority:P0, risk:medium, area:fullstack, area:admin

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-016-admin-report-investigation` into `develop` references this issue and is approved by the reviewer
