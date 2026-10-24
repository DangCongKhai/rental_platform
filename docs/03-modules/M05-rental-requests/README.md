# M05 Rental requests and offline contact
 Owner: Khai for request submission and the tenant views; Kien for the owner inbox and withdraw/reject/15-day auto-rejection. Each reviews the other.

 Contact snapshots, pending enquiries, owner phone discussion, rejection/withdrawal and age15day availability outcome.

 Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

 Critical review focus: Request acceptance atomic with tenancy proposal; one pending thread; lazy 15-day evaluation versus withdrawal/proposal races.

 Explicit boundaries: No calendar, chat or separate manual Accept. Another acceptance does not immediately reject other prospects.
