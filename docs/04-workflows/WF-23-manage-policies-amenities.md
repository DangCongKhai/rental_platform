# WF-23 Manage policies and amenities

Actors: Owner

Requirements: FR60 FR61 FR87

## Preconditions and trigger
Own property/unit form. Trigger is the named user action or due system evaluation.

## Main flow
1. Load canonical amenity catalog and allowed policy schemas.
2. Select standard keys or add plain custom text; preserve shared/private scope.
3. NFC/trim/whitespace normalization and local casefold dedup; validate allowlists/types/limits.
4. Save with the content revision check; contracts store negotiated snapshots independently.

## Alternative and failure flows
- Unknown standard key/owner_label/scope rejected; no automatic semantic slug mapping.
- Shared policy rules cannot be removed via unit overrides.

## Postcondition
Controlled JSONB and predictable canonical filters.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
