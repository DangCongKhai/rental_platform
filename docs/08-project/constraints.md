# Constraints

Next.js serves the UI and server logic; Supabase provides PostgreSQL, Auth and Storage. All domain IDs are UUIDs. Keep the requested entity names and the confirmation timestamps embedded in `tenancy_contracts`. Respect PostgreSQL date/exclusion semantics; do not prove them with SQLite.

No separate worker, queue or scheduler deployment. No paid hosting or services. Product P2 extensions are not core. Do not infer implementation status from the prototype or the docs.

Root `AGENTS.md` governs local operations and must be read. No secret access, force pushes or destructive replacement of existing issues.
