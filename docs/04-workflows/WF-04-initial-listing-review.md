# WF-04 Submit and review initial listing

Actors: Owner and admin

Requirements: FR12 FR13 FR14 FR15 FR55

## Preconditions and trigger

First approval not yet granted; complete package. Trigger is the named user action or due system evaluation.

## Main flow

1. Validate address, marketed units and required photos/terms.
2. Capture listing and property content revisions; mark PENDING.
3. Admin reviews full linked package, approves or rejects with reason.
4. Notify the owner; approval does not publish.

## Alternative and failure flows

- Concurrent content edit invalidates stale approval.
- Two admin terminal decisions yield one winner.

## Postcondition

APPROVED or REJECTED initial decision; no independent property/photo review.

## Consistency boundary

Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
