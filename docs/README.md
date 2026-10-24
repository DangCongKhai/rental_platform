# rentOS implementation documentation

Implementation specification for the rentOS rental platform, built by Khai and Kien. It is not application code and does not certify that features or tests exist in the repository. The docs were adapted from another course's specification: product rules are kept, while that course's infrastructure requirements (async workers, audit/outbox, OpenAPI, logging, monitoring, caching) are removed. Removed requirements keep their IDs and are marked `Removed`.

## Read in this order
1. [Constraints](08-project/constraints.md) and [assumptions](08-project/assumptions.md).
2. [Product scope](01-product/product-scope.md), [business rules](02-domain/business-rules.md), [state transitions](02-domain/state-transition.md).
3. Your module README and PRD under `03-modules/`, then its workflows under `04-workflows/`.
4. [Data model](07-architecture/data-model.md), [action contract](07-architecture/api-design.md) and [test scenarios](06-acceptance/test-scenarios.md).
5. [Team ownership](08-project/team-ownership.md), [issue authoring](08-project/issue-authoring.md) and the backlog in [`planning/`](../planning/issue-plan.md).

The requirements catalogue, acceptance cases and traceability matrix in `06-acceptance/` are generated from the module PRDs: **73 active requirements (8 removed) and 287 acceptance cases**. IDs are never reused.

Use Next.js (server components + Server Actions) for the UI and server logic, and Supabase for PostgreSQL, Auth and Storage. Processing is synchronous; if background work is ever needed, Supabase Cron or a Database Webhook calls a protected Route Handler in the same app.

Local Supabase setup and the day-to-day run order are in [08-project/local-development.md](08-project/local-development.md).

Do not rename `tenancy_contracts`, `tenancy_renewal_requests` or `notifications`. Contract confirmation timestamps live inside `tenancy_contracts`.
