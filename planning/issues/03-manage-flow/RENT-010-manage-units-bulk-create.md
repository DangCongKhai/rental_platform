<!-- rentos-task: RENT-010 -->

# RENT-010 · Owner creates units in bulk and edits each unit (M04, M05)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1.5 days (tentative)

## Outcome

For a separate-units property the owner generates S201–S205 as an editable preview, saves them together, then edits each unit's rent, deposit, minimum term, occupants, private amenities, rule overrides, status and whether it is advertised.

## References

- **FR50** Create and bulk create units · P0 Must (all ACs): FR50-AC01, FR50-AC02, FR50-AC03, FR50-AC04
- **FR51** Edit unit details and advertised terms · P0 Must (all ACs): FR51-AC01, FR51-AC02, FR51-AC03, FR51-AC04
- **FR52** Manage operational status independently of availability · P0 Must (all ACs): FR52-AC01, FR52-AC02, FR52-AC03, FR52-AC04
- **FR61** Resolve unit policy overrides and additional rules · P0 Must: FR61-AC02, FR61-AC03, FR61-AC04
- **FR41** Property and unit server actions · P0 Must: FR41-AC03
- **FR87** Manage consistent standard and custom amenities · P0 Must: FR87-AC01, FR87-AC08
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `M04-Units`, `M05-Unit`
- Modules: [M02](../../../docs/03-modules/M02-property-units-media/prd.md)
- Workflows: [WF-02](../../../docs/04-workflows/WF-02-create-units.md), [WF-21](../../../docs/04-workflows/WF-21-edit-property.md)

## Current repository evidence

- Not implemented.

## Scope and non-goals

**In scope:** Unit actions, units table with bulk generator, unit edit page.

**Not in scope:** Availability search (RENT-003).

## Implementation checklist

- [ ] Preview rows generated from count/prefix/start number/defaults; each row editable
- [ ] Save all rows in one transaction; any invalid row (duplicate label, rent ≤ 0, minimum < 3 months) → nothing saved, errors per row
- [ ] WHOLE_SPACE property cannot get a second unit
- [ ] Unit edits bump the property `content_revision`
- [ ] READY/MAINTENANCE/RETIRED and “advertised” never change existing tenancies

## API and data contract

Server Actions `createUnits(propertyId, rows[])`, `updateUnit`; server read `getUnits(propertyId)`.

## Acceptance criteria

- [ ] 5 studios, prefix S, start 201 → S201–S205 preview; edit S205; save all
- [ ] Duplicate label → whole batch rejected
- [ ] Changing advertised rent does not change any contract
- [ ] Unit override cannot remove the property's shared rules
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests for all-or-nothing saving; unit test for the preview generator.
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
- [ ] PR from `feat/rent-010-manage-units-bulk-create` into `develop` references this issue and is approved by the reviewer
