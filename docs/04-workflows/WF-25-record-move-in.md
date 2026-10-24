# WF-25 Record actual move-in

Actors: Owner

Requirements: FR80

## Preconditions and trigger
Confirmed original agreement and start date reached. Trigger is the named user action or due system evaluation.

## Main flow
1. Recheck same tenancy current lifecycle.
2. Record moved_in_at and set ACTIVE.
3. Record moved_in_at without changing agreement/blocking period.

## Alternative and failure flows
- Before start/unconfirmed/cancelled denied; cancellation race serialized.

## Postcondition
Actual move-in recorded, not inferred from clock.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
