# M10 Engineering operations

Owner: Khai. Reviewer: Kien.

Git workflow, CI, migrations/seeds and unit/integration tests.

Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

Critical review focus: Keep CI green and migrations reproducible.

Explicit boundaries: No logging/alerting, monitoring, caching or OpenAPI work; no paid services.
