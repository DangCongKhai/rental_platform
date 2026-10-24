<!-- rentos-task: RENT-004 -->
# RENT-004 · Save favourite properties from cards and details (S02 sidebar)

**Flow:** Public & auth flow (Guest / signed-in user)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1.5 days (tentative)

## Outcome
A signed-in user hearts a listing card or detail page, the heart stays red after reload, and saved properties appear in the favourites panel; guests get the “Đăng nhập để lưu tin” prompt.

## References
- **FR88** Save and manage favourite properties · P0 Must: FR88-AC01, FR88-AC02, FR88-AC03, FR88-AC05, FR88-AC06, FR88-AC07, FR88-AC08, FR88-AC09, FR88-AC10
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F1 Search and request; screens `S01-Home`, `S02-Search`, `S03-Listing`
- Modules: [M04](../../../docs/03-modules/M04-discovery-favourites/prd.md)
- Workflows: [WF-19](../../../docs/04-workflows/WF-19-save-remove-favourite.md), [WF-20](../../../docs/04-workflows/WF-20-view-favourites.md)

## Current repository evidence
- No favourites code; heart and login prompt exist only in the prototype.

## Scope and non-goals
**In scope:** `saveFavourite`/`removeFavourite` actions, heart button, favourites panel/page with placeholders for unavailable properties.

**Not in scope:** Notifications about saved properties.

## Implementation checklist
- [ ] Save = insert-if-missing, remove = delete-if-present (both safe to repeat); keyed by property
- [ ] Unavailable saved properties show a generic placeholder with no title, photo or address, and can still be removed
- [ ] Heart has `aria-pressed`, updates optimistically, rolls back with a retry message on failure
- [ ] Private favourite data never rendered into shared/static output

## API and data contract
Server Actions `saveFavourite(propertyId)`, `removeFavourite(propertyId)`; server read `getMyFavourites()`.

## Acceptance criteria
- [ ] Heart stays red after reload; count updates
- [ ] Guest heart → login prompt; action refuses guests
- [ ] Double-click ends in the last intended state
- [ ] Switching accounts never shows the previous user's hearts
- [ ] Hidden saved property shows a placeholder and can be removed
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests for repeat save/remove and privacy; component test for heart states.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09) (Khai)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:public, module:M04, priority:P0, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-004-favourite-properties` into `develop` references this issue and is approved by the reviewer
