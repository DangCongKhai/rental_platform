<!-- rentos-task: RENT-006 -->

# RENT-006 · Report a listing and follow the outcome (S05, T09)

**Flow:** Public & auth flow (Guest / signed-in user)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1 day (tentative)

## Outcome

A signed-in user who is not the owner reports a listing with a reason and description, and later sees the status and outcome under “Báo cáo của tôi”.

## References

- **FR38** Report public listing · P0 Must (all ACs): FR38-AC01, FR38-AC02, FR38-AC03, FR38-AC04, FR38-AC05
- **FR72** Reporter outcome and rate limits · P0 Must (all ACs): FR72-AC01, FR72-AC02, FR72-AC03, FR72-AC04
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F7 Report and suspension; screens `S05-Report`, `T09-Reports`
- Modules: [M08](../../../docs/03-modules/M08-reports-admin/prd.md)
- Workflows: [WF-16](../../../docs/04-workflows/WF-16-submit-listing-report.md)

## Current repository evidence

- Not implemented.

## Scope and non-goals

**In scope:** Report dialog, `reportListing` action with a simple per-user limit, my-reports page.

**Not in scope:** Admin handling (RENT-016).

## Implementation checklist

- [ ] Recheck the listing is public; insert OPEN report; notify admins
- [ ] One open report per reporter/listing; simple limit (e.g. 5 reports/hour per user) → friendly error
- [ ] My reports shows status and `resolution_summary`, never `internal_notes`

## API and data contract

Server Action `reportListing(listingId, {reason_code, description})`; server read `getMyReports()`.

## Acceptance criteria

- [ ] Report saved; listing is not hidden automatically
- [ ] Guest cannot report; empty description → field error
- [ ] Listing hidden between view and submit → not found
- [ ] Another user's report is not visible
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests for duplicate, limit and note privacy.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09) (Khai)

## Ownership and review

- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: medium · Estimate: 1 day (revise after starting)
- Labels: flow:public, module:M08, priority:P0, risk:medium, area:fullstack

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-006-report-listing-track-outcome` into `develop` references this issue and is approved by the reviewer
