# WF-24 Withdraw pending enquiry

Actors: Tenant

Requirements: FR28

## Preconditions and trigger
Own pending enquiry. Trigger is the named user action or due system evaluation.

## Main flow
1. Open own enquiry and confirm withdrawal.
2. Lock request and recheck pending.
3. Set WITHDRAWN and notify the owner in the same transaction.

## Alternative and failure flows
- Proposal may win first; accepted enquiry directs to tenancy workflow instead.

## Postcondition
No pending thread or reservation side effect.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
