<!-- rentos-task: RENT-009 -->
# RENT-009 · Owner manages properties with the 5-step wizard (M02, M03)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 2 days (tentative)

## Outcome
In “Quản lý thuê”, the owner sees their properties, creates one through the 5-step wizard (type and arrangement, address, shared amenities, house rules, review), saves incomplete drafts, edits later and archives without losing history.

## References
- **FR07** Create property draft without moderation · P0 Must (all ACs): FR07-AC01, FR07-AC02, FR07-AC03
- **FR08** Manage and archive own property · P0 Must (all ACs): FR08-AC01, FR08-AC02, FR08-AC03, FR08-AC04
- **FR41** Property and unit server actions · P0 Must: FR41-AC01, FR41-AC02
- **FR60** Manage controlled property JSONB policies · P0 Must (all ACs): FR60-AC01, FR60-AC02, FR60-AC03, FR60-AC04
- **FR87** Manage consistent standard and custom amenities · P0 Must: FR87-AC01, FR87-AC02, FR87-AC03, FR87-AC04, FR87-AC05, FR87-AC10
- **FR55** Track content revisions for property, unit and policy edits · P0 Must: FR55-AC01, FR55-AC02
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `ManageSidebar`, `M02-Properties`, `M03-Property`
- Modules: [M02](../../../docs/03-modules/M02-property-units-media/prd.md)
- Workflows: [WF-01](../../../docs/04-workflows/WF-01-create-property.md), [WF-21](../../../docs/04-workflows/WF-21-edit-property.md), [WF-23](../../../docs/04-workflows/WF-23-manage-policies-amenities.md)

## Current repository evidence
- No manage area, property actions or amenity catalog.

## Scope and non-goals
**In scope:** Manage workspace layout and sidebar (with the Người thuê / Chủ nhà switch), property list, wizard, property actions, code-defined amenity catalog, policy schema and `resolveEffectivePolicies` (also used by the listing detail).

**Not in scope:** Units (RENT-010), photos (RENT-011), geocoding (P2).

## Implementation checklist
- [ ] `src/domain/amenities`: stable keys, Vietnamese labels, aliases, property/unit scope; validation; trim + NFC normalization; duplicate custom text removed
- [ ] `src/domain/policies`: property defaults + shared rules; unit overrides + extra rules; `resolveEffectivePolicies`
- [ ] `createProperty`: WHOLE_SPACE also creates its single unit in the same transaction
- [ ] `updateProperty` with `content_revision` check → “reload” message if stale; edits to reviewed content bump `content_revision`
- [ ] `archiveProperty` keeps units, requests and tenancies
- [ ] Wizard with amenity picker (alias search, “Thêm tiện ích khác”) and rules editor; save as draft
- [ ] No old amenity data exists, so FR87-AC10 (legacy migration) needs no work

## API and data contract
Server Actions `createProperty`, `updateProperty`, `archiveProperty`; server reads `getMyProperties()`, `getMyProperty(id)`.

## Acceptance criteria
- [ ] Whole apartment → one property and one unit
- [ ] Incomplete draft saves
- [ ] Another owner's property is not found
- [ ] Stale edit → reload message, no overwrite
- [ ] “aircon” suggests Điều hòa but does not auto-select; unknown amenity key is rejected
- [ ] Archived property leaves the active list; history stays
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Unit tests for amenity/policy validation and resolver; integration tests for ownership, revision conflict and archive.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-002 · Database schema, integrity constraints, notifications helper and seed data (Khai)

## Ownership and review
- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: medium · Estimate: 2 days (revise after starting)
- Labels: flow:manage, module:M02, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-009-manage-properties-wizard` into `develop` references this issue and is approved by the reviewer
