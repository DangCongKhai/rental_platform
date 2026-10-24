# WF-16 Submit report

Actors: Authenticated user

Requirements: FR38 FR72

## Preconditions and trigger
Visible listing at submission. Trigger is the named user action or due system evaluation.

## Main flow
1. Choose reason and supply explanation.
2. Validate target, authenticated actor and rate limit.
3. Persist OPEN synchronously with unique live report; alert after commit.
4. Expose own sanitized outcome.

## Alternative and failure flows
- Guest401; duplicate live report returns existing/conflict.
- Previously saved reports remain after target hidden; new hidden-target report denied.

## Postcondition
Report stored; not automatic takedown.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
