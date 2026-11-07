# M04 Product requirements

## Purpose

Text/address search, same-unit filtering, date availability, public cards/details and private saved properties.

## Actors and permissions

Use server access checks from each FR below. UI guards never replace server checks.

## Functional requirements

### FR19 Search listings by date-based availability

Priority: P0 Must. Actors: Guest; User. Dependencies: Shared identity/resource foundation.

Factors: Eligibility; pagination; cost

Tools: Next.js + React + Tailwind + server queries + PostgreSQL FTS/indexes

Search public eligible listings by text/address and paginated filters. Query units whose full desired interval has no blocking tenancy overlap. Without dates use today through each unit minimum rental term; label this default. Never use property RENTED or a stored availability count.

Acceptance criteria:

- FR19-AC01 [Positive] Two units, one occupied for requested interval → Return listing with only qualifying unit count/prices.
- FR19-AC02 [Boundary] Unit booked July onward and search requests April-June → Return if operational/marketing conditions and minimum term are met.
- FR19-AC03 [Integrity] One unit meets price and another meets room filter → Listing qualifies only if the same eligible unit meets combined filters.
- FR19-AC04 [Race] Reservation commits between search and proposal → Search is indicative; proposal rechecks database exclusion and returns conflict if needed.

### FR20 Filter eligible units for the full requested interval

Priority: P0 Must. Actors: Guest; User. Dependencies: Shared identity/resource foundation.

Factors: Same-unit semantics; client response order

Tools: Next.js + React + Tailwind + Server Actions + server validation + server access checks + Supabase PostgreSQL

Support price, area, type, amenities, occupants and controlled policy filters on the same available unit. Start/end dates are both required when filtering dates; inclusive end is converted to [start,end+1day). Amenity filters use canonical catalog keys with enabled=true on eligible units/property scope; distinguish shared laundry from an in-unit washing machine. Custom descriptions never automatically match standard filters (FR87).

Acceptance criteria:

- FR20-AC01 [Positive] User filters pets allowed and rent below 5m → Apply inherited effective pet policy and rent to same eligible unit.
- FR20-AC02 [Validation] Missing one boundary, reversed dates or period below unit minimum → Return clear validation/empty qualification as applicable.
- FR20-AC03 [Boundary] One tenancy ends June30 and next starts July1 → Adjacent intervals do not overlap.
- FR20-AC04 [Race] Operational status changes during pagination → Fresh query respects new status; no authoritative reservation inferred.

### FR21 Display listing details and eligible unit cards

Priority: P0 Must. Actors: Guest; User. Dependencies: Shared identity/resource foundation.

Factors: Accurate linked data; privacy

Tools: Next.js + React + Tailwind + next/image + safe response data

Show shared gallery, advertised rules, unit photos/specifications/prices and date-qualified availability. Owner contact enquiry form has contact name/phone/message and desired date range. Never display agreement documents or other prospects contact details. Display canonical localized amenity labels with owner details, separating shared property facilities, private unit features and additional custom text (FR87).

Acceptance criteria:

- FR21-AC01 [Positive] Open published listing for date range → Show qualifying unit cards and effective policies; dates visible.
- FR21-AC02 [Security] Direct URL targets suspended/hidden/unapproved listing → 404 or unavailable page with no hidden content payload.
- FR21-AC03 [Integrity] Current advertised policies differ from signed contract → Label advertising separately; no rewrite of contractual rules.
- FR21-AC04 [Race] Listing suspended while a visitor has the page open → The next request checks current visibility before returning any listing data.

### FR22 Interactive listing map

Priority: P2 Defer. Actors: Guest; User. Dependencies: FR19 FR24.

Factors: Location privacy; scope

Tools: Next.js + React + Tailwind + map provider SDK

Optional map of eligible listings with valid approximate/public coordinates. Keep exact private information out of marker payloads.

Acceptance criteria:

- FR22-AC01 [Positive] Map enabled with valid coordinates → Only eligible filtered properties displayed.
- FR22-AC02 [Failure] Provider unavailable or coordinates missing → List search remains usable.

### FR23 Synchronize map and filters

Priority: P2 Defer. Actors: Guest; User. Dependencies: FR22 FR20.

Factors: Consistent query scope

Tools: Next.js + React + Tailwind + map SDK + shared server search service

Use same normalized filter service for map and list; map bounding changes have explicit URL/query state.

Acceptance criteria:

- FR23-AC01 [Positive] Filters change → Map/list apply identical visibility and unit criteria.
- FR23-AC02 [Race] Map requests finish out of order → Stale result discarded.

### FR40 Public listing reads

Priority: P0 Must. Actors: Guest; API client. Dependencies: Shared identity/resource foundation.

Factors: Consistent DTO; pagination

Tools: Next.js server components + safe response data

Search and detail pages read through one public eligibility function returning safe unit/media/policy data with pagination and clear errors.

Acceptance criteria:

- FR40-AC01 [Positive] Valid search/detail requests → Results render with the documented fields.
- FR40-AC02 [Negative] Unavailable/nonexistent UUID → Not-found page; invalid filter → field error.
- FR40-AC03 [Security] Public response serialized → No private documents, tokens, admin flags or tenant contacts.

### FR46 Cache public listing content with fresh visibility checks

Priority: Removed (was Removed (was P1 Should)). Actors: System.

Removed by team decision: Caching work is not required for this project. The ID is kept and not reused.

### FR77 Calculate availability counts and rent ranges

Priority: P0 Must. Actors: System. Dependencies: Shared identity/resource foundation.

Factors: No stale counters; same-unit search

Tools: Next.js Server Actions + server validation + server access checks + Supabase PostgreSQL + PostgreSQL queries

For each selected interval, eligible unit has complete required listing data, is READY, marketed, nonarchived, minimum-duration compliant and has no overlap with blocking tenancy envelope. Pending-confirmation holds count as blocked until explicit expiry release. Count and rent range derive from same qualifying query. Without dates use each unit minimum term from today.

Acceptance criteria:

- FR77-AC01 [Positive] One of two units reserved for requested period → Available count2→1 and range from remaining unit.
- FR77-AC02 [Boundary] Two tenancies on same unit occupy distinct future intervals → Only intersecting searches exclude it; do not treat any tenancy row as permanent occupation.
- FR77-AC03 [Race] Reservation expires concurrently with inventory read → Committed query gives coherent before/after; proposal action rechecks/reaps due holds under lock.
- FR77-AC04 [Integrity] Last unit unavailable → Hide from available search for that interval; do not change stored publication_status or auto-republish owner-hidden content.

### FR88 Save and manage favourite properties

Priority: P0 Must. Actors: Authenticated user. Dependencies: FR05 FR19 FR21 FR43 FR78.

Factors: Stable property identity; private data; repeat-safe writes; race-safe UI; visibility

Tools: Next.js heart/list UI + server access checks and Server Actions + PostgreSQL unique pair

Authenticated users save properties through the heart on listing cards/details, remove saved properties and view a private paginated favourites list and count. Persist favourite_properties keyed to user_profiles and properties, not listings or units. Guests are prompted to sign in. Use PUT desired saved state and DELETE desired unsaved state, not a toggle endpoint. Keep unavailable relations as generic placeholders without hidden listing content. Favouriting is not an enquiry, subscription or reservation. User reports this feature has been added; actual implementation completeness must be checked in the local repository.

Acceptance criteria:

- FR88-AC01 [Positive] Authenticated user hearts a public property card → Persist favourite_properties for the verified user and property; red heart and private count reflect saved state after reload.
- FR88-AC02 [Authorization] Guest hearts a card or calls the save action → UI invites sign-in; the action refuses guests. No anonymous server record; no automatic save after login in MVP.
- FR88-AC03 [Integrity] Same property appears through different unit cards or a new current listing → One saved property identity; do not key favourite by unit_id or listing_id.
- FR88-AC04 [Race] Two save requests for the same user/property arrive together → UNIQUE(user_id,property_id) yields one row; both requests succeed; no error or duplicate count.
- FR88-AC05 [Race] User double-clicks or add/remove responses arrive out of order → Client serializes per-property intended-state writes and refetches after settle; no stale response flips latest intent. Concurrent devices converge to last committed server state.
- FR88-AC06 [Privacy] Different account opens favourites or user switches accounts → Server actions derive the actor from the session; no foreign rows; user-specific client state cleared on logout/switch.
- FR88-AC07 [Visibility] Saved property listing becomes hidden, suspended or archived → Retain saved relation but return generic unavailable placeholder with no title, photos, address or moderation reason; no private-content bypass. Removal still allowed.
- FR88-AC08 [Positive] User removes favourite twice → Both removals succeed; only own pair removed; heart/count/list reconcile.
- FR88-AC09 [Failure] Network write fails during optimistic UI update → Restore/refetch actual saved state, show retry feedback; do not report success or save offline.
- FR88-AC10 [Boundary] Property has no unit available for chosen dates, but listing remains owner-published and unsuspended → Keep favourite; availability is not a reservation or permanent deletion. Show availability only through authorized/current visibility response. No query holds a unit.

## Data and API boundary

Use the shared data dictionary and the server action contract in `07-architecture/api-design.md`; do not invent tables/enums to suit one screen. Every issue names the actions, schema fields and stale-state behavior it changes.

## Failure and concurrency

No shared-cache private favourite flags, no availability promises, correct unavailable placeholders. Ordinary permission/validation/empty/network states are part of completion, alongside the specific race cases above. PostgreSQL invariants require real database tests.

## Definition of done

UI and server actions integrated; unit and integration tests; public pages expose no private data; docs synchronized; issue-linked PR and reviewer evidence. No implementation is claimed here.

## Out of scope

Maps deferred. Save properties, not listings/units. Favourites never allocate units or send enquiries.
