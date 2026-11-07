# Performance and resource loading

Keep pages reasonably fast without dedicated optimisation work: use `next/image` with sizes for photos, paginate every list, load related rows in one query instead of one query per row, and add indexes for the search filters and the owner inbox. Contract documents download only on demand. Discard out-of-order search results so an older response never replaces a newer one. No AI thumbnail service.
