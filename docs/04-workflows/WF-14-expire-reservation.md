# WF-14 Expire unconfirmed reservation

Actors: System (lazy, inside user actions)

Requirements: FR83

## Preconditions and trigger
Server deadline passed; exact current pending version. Triggered lazily: the tenant tries to confirm, someone opens the tenancy, or a proposal/correction/renewal needs the unit's dates. Fallback if background release is ever needed: a Supabase Cron job calls a protected Route Handler that runs the same function.

## Main flow
1. Inside the caller's transaction, lock the tenancy and recheck pointer/deadline.
2. Original becomes EXPIRED; clear hold/pending metadata.
3. Renewal expiry releases only extension and keeps confirmed agreement/request pending.
4. Notify both parties in the same transaction.

## Alternative and failure flows
- A stale release cannot expire a newer correction or a confirmed agreement.
- Until released, search treats the expired hold as free; the database row is only changed by an explicit release, never by now() in the GiST predicate.

## Postcondition
Expired pending work cannot retain a permanent temporary reservation.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
