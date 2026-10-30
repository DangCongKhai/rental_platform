<!-- rentos-task: RENT-003 -->
# RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09)

**Flow:** Public & auth flow (Guest / signed-in user)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 3 days (tentative)

## Outcome
A visitor searches by area or keyword from the home page, filters results by dates, price, type, occupants, rules and amenities, and opens a listing showing its gallery, shared amenities, advertised rules and the units free for the chosen dates; hidden or suspended listings show “Tin đăng không khả dụng”.

## References
- **FR19** Search listings by date-based availability · P0 Must (all ACs): FR19-AC01, FR19-AC02, FR19-AC03, FR19-AC04
- **FR20** Filter eligible units for the full requested interval · P0 Must (all ACs): FR20-AC01, FR20-AC02, FR20-AC03, FR20-AC04
- **FR21** Display listing details and eligible unit cards · P0 Must (all ACs): FR21-AC01, FR21-AC02, FR21-AC03, FR21-AC04
- **FR40** Public listing reads · P0 Must (all ACs): FR40-AC01, FR40-AC02, FR40-AC03
- **FR77** Calculate availability counts and rent ranges · P0 Must (all ACs): FR77-AC01, FR77-AC02, FR77-AC03, FR77-AC04
- **FR61** Resolve unit policy overrides and additional rules · P0 Must: FR61-AC01
- **FR87** Manage consistent standard and custom amenities · P0 Must: FR87-AC06
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F1 Search and request; screens `S01-Home`, `S02-Search`, `S03-Listing`, `S08-Unavailable`, `S09-Guide`, `Mob-S01`, `Mob-S02`, `Mob-S03`
- Modules: [M04](../../../docs/03-modules/M04-discovery-favourites/prd.md)
- Workflows: [WF-06](../../../docs/04-workflows/WF-06-search-listings.md)

## Current repository evidence
- The homepage is `src/components/home/home-page.tsx`. Browse is `src/features/discovery`. Listing detail layout is `src/components/listings`.
- No search query, results page, detail page or guide page.

## Scope and non-goals
**In scope:** Availability search query, `isPubliclyVisible` gate, `/listings` results (filter sidebar / mobile bottom sheet), `/listings/[id]` detail, S08 page, S09 guide page, landing wired to real listings. Reads happen in server components.

**Not in scope:** Favourites (RENT-004), request form (RENT-005), report dialog (RENT-006), map (P2).

## Implementation checklist
- [ ] `isPubliclyVisible(listing)` = approved ∧ published ∧ not suspended ∧ not archived, in `src/server/listings/visibility.ts`; used by every public page and by owner publishing (RENT-012)
- [ ] Unit qualifies when READY, marketed, not archived, minimum term met and no blocking tenancy overlaps `[start, end+1)`; a PENDING_CONFIRMATION hold whose deadline has passed does not block
- [ ] Without dates use today + unit minimum term and say so on the page
- [ ] All filters apply to the same unit; amenity filter uses the catalog key with `enabled=true`
- [ ] Free-unit count and rent range come from the same query; paginate; load relations in one query
- [ ] Filters live in the URL; a date range needs both ends
- [ ] Detail: shared amenities vs private unit features vs custom text; advertised rules labelled as advertising
- [ ] Replace static `LISTINGS`; hero search submits to `/listings`

## API and data contract
Server-side `searchListings(filters)` and `getPublicListing(id, dates)` in `src/server/listings/`.

## Acceptance criteria
- [ ] Two units, one booked for the period → listing shows one free unit
- [ ] Unit booked from July is free for April–June
- [ ] Price met by one unit and bedrooms by another → listing not shown
- [ ] Half-filled or reversed dates → field error
- [ ] Suspended listing URL → S08 with none of its content
- [ ] Shared laundry does not match an in-unit washing machine filter
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests on seed data for each acceptance case; component tests for the filter form.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-002 · Database schema, integrity constraints, notifications helper and seed data (Khai)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: high · Estimate: 3 days (revise after starting)
- Labels: flow:public, module:M04, priority:P0, risk:high, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-003-browse-search-listing-detail` into `develop` references this issue and is approved by the reviewer
