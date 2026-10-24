<!-- rentos-task: RENT-012 -->
# RENT-012 · Owner builds the listing, submits it for review and publishes it (M07, M08/M09)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 2 days (tentative)

## Outcome
The owner writes the listing title and description, picks advertised units and the cover, sees a completeness checklist, submits (“Gửi duyệt”), and after approval publishes, hides or archives it; badges show review, publication and suspension separately.

## References
- **FR10** Create property-level listing draft · P0 Must (all ACs): FR10-AC01, FR10-AC02, FR10-AC03, FR10-AC04
- **FR11** Edit listing without reapproval after initial approval · P0 Must: FR11-AC01, FR11-AC04
- **FR12** Submit initial listing package · P0 Must (all ACs): FR12-AC01, FR12-AC02, FR12-AC03, FR12-AC04
- **FR17** Publish initially approved listing · P0 Must (all ACs): FR17-AC01, FR17-AC02, FR17-AC03, FR17-AC04
- **FR18** Hide or archive listing · P0 Must (all ACs): FR18-AC01, FR18-AC02, FR18-AC03
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `M07-Listings`, `M08-ListingEditor`
- Modules: [M03](../../../docs/03-modules/M03-listings-moderation/prd.md)
- Workflows: [WF-03](../../../docs/04-workflows/WF-03-create-listing.md), [WF-04](../../../docs/04-workflows/WF-04-initial-listing-review.md), [WF-05](../../../docs/04-workflows/WF-05-publish-listing.md), [WF-27](../../../docs/04-workflows/WF-27-hide-archive-listing.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Listing actions, listings table with status badges, editor with checklist and status banners.

**Not in scope:** Admin decision (RENT-014), suspension (RENT-015).

## Implementation checklist
- [ ] One current listing per property; cover must be a selected photo of the same property
- [ ] Completeness check: address, ≥ 1 shared photo, photo per advertised unit, unit terms, rules
- [ ] Submit from DRAFT/REJECTED → PENDING and store `submitted_content_revision`; notify admins
- [ ] Publish only when approved, not suspended, not archived, complete and at least one READY advertised unit is free; reuse `isPubliclyVisible` from RENT-003
- [ ] Hide/archive keep requests and tenancies; owner cannot change suspension fields
- [ ] Banners: Đang duyệt, Bị từ chối (reason), Bị đình chỉ bởi admin

## API and data contract
Server Actions `saveListing`, `submitListing`, `publishListing`, `hideListing`, `archiveListing`.

## Acceptance criteria
- [ ] Draft reuses units and photos without copying
- [ ] Missing unit photo → error naming the unit
- [ ] Approved listing never goes back to review; later edits apply directly
- [ ] Unapproved or suspended listing cannot be published
- [ ] Hidden listing disappears from public pages
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Unit test for the completeness check; integration tests for one-listing rule and publish rules.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-010 · Owner creates units in bulk and edits each unit (M04, M05) (Kien)
- RENT-011 · Owner uploads and manages property and unit photos with Supabase Storage (M06) (Kien)
- RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09) (Khai)

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: high · Estimate: 2 days (revise after starting)
- Labels: flow:manage, module:M03, priority:P0, risk:high, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-012-manage-listings-submit-publish` into `develop` references this issue and is approved by the reviewer
