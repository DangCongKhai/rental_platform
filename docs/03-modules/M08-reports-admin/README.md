# M08 Reports and administrative screens

Owner: Kien for admin screens and actions; Khai for report submission. Each reviews the other.

Admin report table/detail, review queues, required-reason forms and reporter outcome.

Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

Critical review focus: Admin UI is not the authorization boundary; protected actions remain reviewed backend work.

Explicit boundaries: Property reviews deferred. Every admin action checks `is_admin` on the server.
