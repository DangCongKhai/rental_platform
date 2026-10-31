# M07 Product requirements

## Purpose

Tenant renewal request, negotiated consecutive segment proposal, extension hold and mutual confirmation under same tenancy.

## Actors and permissions

Use server access checks from each FR below. UI guards never replace server checks.

## Functional requirements

### FR68 Submit one pending renewal request

Priority: P0 Must. Actors: Tenant. Dependencies: Shared identity/resource foundation.

Factors: One pending request; original proposal integrity

Tools: shared server service + DB transaction + row lock + PostgreSQL constraints + Next.js + React + Tailwind

Tenant on CONFIRMED/ACTIVE tenancy requests a later end date and proposed monthly rent. At most one PENDING renewal request per tenancy. Request alone changes no dates/availability. Allow one upcoming renewal workflow at a time; request proposal values remain immutable.

Acceptance criteria:

- FR68-AC01 [Positive] Tenant requests continuation through December → PENDING renewal request; original term/range unchanged.
- FR68-AC02 [Race] Concurrent renewal requests → Partial unique index permits one PENDING row.
- FR68-AC03 [Validation] Wrong tenant, ended tenancy, invalid date/rent or upcoming confirmed renewal exists → Reject with clear reason.
- FR68-AC04 [Integrity] Owner discusses different final rent offline → Keep requested value; final version stores separately negotiated amount.

### FR69 Withdraw or reject pending renewal request

Priority: P0 Must. Actors: Tenant; Owner. Dependencies: Shared identity/resource foundation.

Factors: Explicit final states; no approval-only extension

Tools: shared server service + DB transaction + row lock + PostgreSQL constraints + Next.js + React + Tailwind

Tenant cancels or owner rejects PENDING renewal request with reason. If a pending renewal contract exists, invalidate its pending pointer and restore blocked envelope to confirmed dates in same transaction; old version/confirmations remain history.

Acceptance criteria:

- FR69-AC01 [Positive] Tenant withdraws renewal with reserved extension → CANCELLED; pending pointer cleared; only unconfirmed extension released.
- FR69-AC02 [Positive] Owner rejects request → REJECTED with reason, no change to confirmed original contract.
- FR69-AC03 [Race] Withdrawal/rejection competes with final mutual confirmation → One terminal result; accepted renewal cannot be silently cancelled as pending.
- FR69-AC04 [Integrity] Old notification refers to cancelled renewal version → Confirmation endpoint rejects stale/terminal workflow.

### FR70 Propose renewal as new immutable version

Priority: P0 Must. Actors: Owner. Dependencies: Shared identity/resource foundation.

Factors: Atomic agreement linkage; consecutive terms

Tools: Next.js server validation + server access checks + DB transaction/row lock + PostgreSQL constraints + private document Storage

Owner records negotiated consecutive continuation dates/rent/document from PENDING renewal request. Add RENEWAL contract version under same tenancy and owner confirmation, reserve extension via blocked envelope. Renewal request remains PENDING until tenant confirms same version; then mark ACCEPTED atomically with confirmed span expansion.

Acceptance criteria:

- FR70-AC01 [Positive] Original Jan-June; proposed July-Dec at4.2m → New RENEWAL version, temporary July-Dec extension reservation; current rent unchanged.
- FR70-AC02 [Validation] Start is not confirmed_end+1day or end not later → Reject; no gaps/overlaps or altered original term.
- FR70-AC03 [Race] Future tenancy already reserves overlapping extension → Exclusion constraint fails; request stays PENDING; original agreement remains.
- FR70-AC04 [Race] Two owners tabs propose or correct renewal → One pending version under the tenancy lock; no parallel effective renewal.
- FR70-AC05 [Integrity] Tenant confirms version after owner confirmation → Request ACCEPTED, extension confirmed; future rent activates only on renewal start.
- FR70-AC06 [Failure] Mutual confirmation transaction fails → No partial ACCEPTED renewal or confirmed extension.

## Data and API boundary

Use the shared data dictionary and the server action contract in `07-architecture/api-design.md`; do not invent tables/enums to suit one screen. Every issue names the actions, schema fields and stale-state behavior it changes.

## Failure and concurrency

One pending request; future-booking conflict; expire/decline releases only extension. Ordinary permission/validation/empty/network states are part of completion, alongside the specific race cases above. PostgreSQL invariants require real database tests.

## Definition of done

UI and server actions integrated; unit and integration tests; public pages expose no private data; docs synchronized; issue-linked PR and reviewer evidence. No implementation is claimed here.

## Out of scope

Never rewrite original contract, never accept renewal on owner submission alone; many draft corrections may reference one request.
