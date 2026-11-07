<!-- rentos-task: RENT-015 -->

# RENT-015 · Admin manages listings and suspends or restores them (A06)

**Flow:** Admin flow (Admin)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1 day (tentative)

## Outcome

An admin searches all listings, suspends a harmful one with a reason (it disappears from every public page at once and the owner sees a suspension banner), and later restores it without republishing it for the owner.

## References

- **FR78** Suspend and restore listings after reports or inspection · P0 Must: FR78-AC03, FR78-AC04, FR78-AC05
- **FR11** Edit listing without reapproval after initial approval · P0 Must: FR11-AC03
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F7 Report and suspension; screens `A06-Listings`, `S08-Unavailable`
- Modules: [M03](../../../docs/03-modules/M03-listings-moderation/prd.md)
- Workflows: [WF-17](../../../docs/04-workflows/WF-17-investigate-suspend.md)

## Current repository evidence

- Not implemented.

## Scope and non-goals

**In scope:** Admin listings table with filters, suspend/restore actions (reused by report handling), owner suspension banner.

**Not in scope:** Report queue (RENT-016).

## Implementation checklist

- [ ] Suspend sets `admin_suspended_at/by` and reason; notify the owner
- [ ] Restore clears suspension only; the owner's published/hidden choice is unchanged
- [ ] Owner actions cannot clear suspension

## API and data contract

Server Actions `suspendListing(id, reason)`, `restoreListing(id, reason)`; server read `getAdminListings(filters)`.

## Acceptance criteria

- [ ] Suspended listing → S08 and gone from search
- [ ] Restored owner-hidden listing stays hidden
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests for the owner-clear attempt and public pages.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-014 · Admin dashboard and first review of listing packages (A01, A02, A03) (Kien)
- RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09) (Khai)

## Ownership and review

- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: high · Estimate: 1 day (revise after starting)
- Labels: flow:admin, module:M03, priority:P0, risk:high, area:fullstack, area:admin

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-015-admin-listing-suspension` into `develop` references this issue and is approved by the reviewer
