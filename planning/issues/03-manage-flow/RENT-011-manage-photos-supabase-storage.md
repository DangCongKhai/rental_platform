<!-- rentos-task: RENT-011 -->
# RENT-011 · Owner uploads and manages property and unit photos with Supabase Storage (M06)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1.5 days (tentative)

## Outcome
On the media page the owner uploads photos for the property or a unit, chooses which appear, drags to reorder, sets the cover, writes captions, replaces a photo with a new upload and removes unused ones.

## References
- **FR09** Upload property and unit photos · P0 Must (all ACs): FR09-AC01, FR09-AC02, FR09-AC03
- **FR56** Select reorder and remove gallery images · P0 Must (all ACs): FR56-AC01, FR56-AC02, FR56-AC03, FR56-AC04
- **FR57** Update photos without a replacement-review workflow · P0 Must (all ACs): FR57-AC01, FR57-AC02, FR57-AC03, FR57-AC04
- **FR55** Track content revisions for property, unit and policy edits · P0 Must: FR55-AC04
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `M06-Media`
- Modules: [M02](../../../docs/03-modules/M02-property-units-media/prd.md)
- Workflows: [WF-22](../../../docs/04-workflows/WF-22-update-media.md)

## Current repository evidence
- No storage bucket, upload action or media rows.

## Scope and non-goals
**In scope:** `property-media` bucket, upload service (also used for contract PDFs in RENT-017), media actions, media page.

**Not in scope:** Physical deletion of removed photos (they stay soft-deleted).

## Implementation checklist
- [ ] Check file type by content, size and count before storing
- [ ] Unique object path per upload, never overwrite; save sha256/size/type; create the row only after the upload succeeds
- [ ] Storage failure → friendly error, no broken row
- [ ] Gallery update (selected, order, caption, cover) bumps `content_revision`
- [ ] Replace = new upload, then swap references; removing the cover of a published listing needs a new cover first

## API and data contract
Server Actions `uploadPhoto(propertyId, file, unitId?)`, `updateGallery`, `removePhoto`, `replacePhoto`.

## Acceptance criteria
- [ ] Photo links to the chosen unit
- [ ] A `.jpg` that is really text is rejected
- [ ] Unit from another property is rejected
- [ ] Removing the published cover without a replacement is blocked with options
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests with a storage fake; one manual run against local Supabase Storage.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-009 · Owner manages properties with the 5-step wizard (M02, M03) (Kien)

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:manage, module:M02, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-011-manage-photos-supabase-storage` into `develop` references this issue and is approved by the reviewer
