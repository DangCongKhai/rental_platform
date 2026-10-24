# WF-12 Request renewal

Actors: Tenant

Requirements: FR68 FR69

## Preconditions and trigger
Related CONFIRMED/ACTIVE tenancy; no pending/upcoming renewal workflow. Trigger is the named user action or due system evaluation.

## Main flow
1. Enter later requested end, proposed rent and message.
2. Validate requester and proposal; save one PENDING renewal request.
3. Notify owner; discuss offline without changing agreement/range.
4. Tenant may cancel or owner reject with reason, releasing any unconfirmed extension.

## Alternative and failure flows
- Parallel request unique constraint permits one pending.
- No automatic extension from request submission.

## Postcondition
Pending proposal or terminal request rejection/cancellation.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
