# M10 Product requirements

## Purpose
Git workflow, CI, migrations/seeds and unit/integration tests.

## Actors and permissions
Use server access checks from each FR below. UI guards never replace server checks.

## Functional requirements

### FR44 OpenAPI documentation
Priority: Removed (was Removed (was P1 Should)). Actors: Developer.

Removed by team decision: OpenAPI documentation is not required for this project. The ID is kept and not reused.

### FR47 Structured logs and critical alerts
Priority: Removed (was Removed (was P1 Should)). Actors: System; Developer.

Removed by team decision: Structured logging and alerting are not required for this project. The ID is kept and not reused.

### FR48 Development monitoring and slow query alerts
Priority: Removed (was Removed (was P1 Should)). Actors: Developer; authorized admin.

Removed by team decision: Diagnostics and slow-query alerts are not required for this project. The ID is kept and not reused.

### FR76 Deferred and excluded MVP scope
Priority: P3 Exclude. Actors: Team. Dependencies: Shared identity/resource foundation.

Factors: Feasible five-week scope

Tools: No new service

No phone OTP, property/image moderation, image replacement review, in-app viewing calendar, platform e-signature engine, payment collection, mid-term confirmed-contract amendment, Kafka/RabbitMQ, Elasticsearch or custom thumbnail AI in initial MVP. Supabase Auth email confirmation remains. Maps/Google sign-in/property reviews retain separately marked deferred priorities.

Acceptance criteria:

- FR76-AC01 [Integrity] Review MVP screens/API/schema → No mandatory phone verification or removed review/scheduling workflow.
- FR76-AC02 [Integrity] Contract confirmation shown → Describe participant acknowledgement of stored version; do not claim verified legal e-signature.
- FR76-AC03 [Positive] Later extension added → Use explicit requirements/migration rather than reviving removed states implicitly.

## Data and API boundary
Use the shared data dictionary and the server action contract in `07-architecture/api-design.md`; do not invent tables/enums to suit one screen. Every issue names the actions, schema fields and stale-state behavior it changes.

## Failure and concurrency
Keep CI green and migrations reproducible. Ordinary permission/validation/empty/network states are part of completion, alongside the specific race cases above. PostgreSQL invariants require real database tests.

## Definition of done
UI and server actions integrated; unit and integration tests; public pages expose no private data; docs synchronized; issue-linked PR and reviewer evidence. No implementation is claimed here.

## Out of scope
No logging/alerting, monitoring, caching or OpenAPI work; no paid services.
