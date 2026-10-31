# WF-15 Evaluate15day automatic rejection

Actors: System (lazy, when request pages load)

Requirements: FR85

## Preconditions and trigger

PENDING enquiry age>=15days. Triggered lazily when the owner inbox or tenant request pages load. Fallback if background evaluation is ever needed: a Supabase Cron job calls a protected Route Handler that runs the same function.

## Main flow

1. Lock property/inventory/request; reap due holds first.
2. Evaluate complete stored desired interval over eligible alternatives.
3. If any alternative fits keep pending and record check time.
4. If none fits reject NO_AVAILABLE_UNIT and notify once.

## Alternative and failure flows

- Preferred unit is soft preference; manual hidden publication is not occupation.
- Concurrent addition/maintenance release/accept/withdraw is serialized; never shift past desired dates silently.

## Postcondition

Only due and genuinely unavailable enquiry rejected.

## Consistency boundary

Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
