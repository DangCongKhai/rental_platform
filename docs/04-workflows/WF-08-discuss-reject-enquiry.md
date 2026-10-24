# WF-08 Discuss or reject enquiry

Actors: Owner

Requirements: FR29 FR31

## Preconditions and trigger
Own property PENDING enquiry. Trigger is the named user action or due system evaluation.

## Main flow
1. Read private contact details.
2. Phone/view/sign discussion occurs offline while request stays PENDING.
3. Reject with required reason or open separate tenancy-proposal form.
4. Notify terminal rejection after commit.

## Alternative and failure flows
- Withdraw/propose/reject race has one terminal winner.
- No standalone manual Accept endpoint.

## Postcondition
PENDING discussion or reasoned REJECTED outcome.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
