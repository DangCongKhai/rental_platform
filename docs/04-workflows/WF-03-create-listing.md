# WF-03 Create listing draft

Actors: Owner

Requirements: FR10 FR11

## Preconditions and trigger

Own nonarchived property; no current listing. Trigger is the named user action or due system evaluation.

## Main flow

1. Select property and units to market.
2. Reuse linked specifications, media, policies and asking terms.
3. Enter title/description, choose selected same-property shared cover.
4. Preview and save DRAFT; next steps are separate initial review and publication.

## Alternative and failure flows

- Missing data allowed in draft but blocks submission.
- Concurrent same-property create rejected by partial unique index.

## Postcondition

One property-level draft, never one mandatory listing per unit.

## Consistency boundary

Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
