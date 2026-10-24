# M01 Identity and access
 Owner: Khai. Reviewer: Kien.

 Supabase identity, profile bootstrap, dual tenant/owner navigation and server resource authorization.

 Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

 Critical review focus: Session checks on every private read and action, account isolation and admin privilege boundaries.

 Explicit boundaries: No second password store. Google OAuth is deferred. The server verifies the Supabase session with `getClaims()`.
