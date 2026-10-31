# WF-21 Edit property and units

Actors: Owner

Requirements: FR08 FR51 FR52 FR55

## Preconditions and trigger

Own inventory. Trigger is the named user action or due system evaluation.

## Main flow

1. Submit editable fields.
2. Validate operational state/numeric terms; lock common property content.
3. Increment content_revision when reviewed content changes.
4. First-review snapshot invalidates before approval; later valid content appears directly without reapproval.

## Alternative and failure flows

- Stale409; archive/maintenance races use shared lock.
- Do not alter existing contract terms or auto-cancel occupancies.

## Postcondition

Updated inventory and coherent first-review state.

## Consistency boundary

Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
