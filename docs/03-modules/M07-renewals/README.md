# M07 Tenancy renewal requests
 Owner: Kien. Reviewer: Khai.

 Tenant renewal request, negotiated consecutive segment proposal, extension hold and mutual confirmation under same tenancy.

 Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

 Critical review focus: One pending request; future-booking conflict; expire/decline releases only extension.

 Explicit boundaries: Never rewrite original contract, never accept renewal on owner submission alone; many draft corrections may reference one request.
