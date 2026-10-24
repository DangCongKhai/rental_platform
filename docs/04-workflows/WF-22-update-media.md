# WF-22 Upload select replace or remove photos

Actors: Owner

Requirements: FR09 FR56 FR57

## Preconditions and trigger
Own property/unit scope. Trigger is the named user action or due system evaluation.

## Main flow
1. Validate bytes/MIME/count/size then upload new unique object.
2. Only completed upload yields selectable row.
3. Swap cover/gallery after success; photo changes need no per-image review.
4. Soft-delete removed photos; stored files are kept (no purge job).

## Alternative and failure flows
- Failed upload keeps old cover; no overwriting referenced bytes.
- Cover removal requires replacement or hide.

## Postcondition
Consistent selected gallery and safe storage.

## Consistency boundary
Use server access checks and the shared server functions; each state change runs in one transaction and inserts its notifications in that transaction. A read/favourite is never an allocation authority.
