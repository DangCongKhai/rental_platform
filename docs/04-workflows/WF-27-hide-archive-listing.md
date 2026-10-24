# WF-27 Hide or archive listing

Actors: Owner

Requirements: FR18

## Preconditions and trigger
Own listing. Trigger is the named user action or due system evaluation.

## Main flow
1. Choose hide/archive; public pages stop showing it on the next request.
2. Retain related private enquiry/tenancy history.
3. Republish only via publication workflow; no automatic republish when unit becomes free.

## Alternative and failure flows
- Owner cannot clear admin suspension.

## Postcondition
Owner publication choice separate from physical availability.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
