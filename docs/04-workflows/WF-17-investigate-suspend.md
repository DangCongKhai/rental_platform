# WF-17 Investigate and suspend or restore

Actors: Admin

Requirements: FR39 FR78

## Preconditions and trigger

Trusted admin privilege, report or direct inspection. Trigger is the named user action or due system evaluation.

## Main flow

1. Read current content and report history; mark report reviewing.
2. Resolve/dismiss with reason and private versus public notes.
3. If needed suspend listing independently of initial approval.
4. Explicit admin restoration after checking corrections; owner publication choice still respected.

## Alternative and failure flows

- Owner edit/publish cannot remove suspension.
- Two final report decisions yield one legal result.

## Postcondition

Recorded admin outcome and safe public visibility.

## Consistency boundary

Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
