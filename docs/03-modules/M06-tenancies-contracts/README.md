# M06 Tenancies contract versions and reservations

Owner: Khai for the contract flow and deadline expiry; Kien for end/cancel. Each reviews the other.

Exact unit allocation, immutable tenancy_contracts, embedded confirmations, correction chains, temporary holds and lifecycle actions. Both parties' screens are built in the same flow issue as the actions.

Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

Critical review focus: GiST exclusion, participant/hash/version agreement, deadline races, projections and write-once metadata.

Explicit boundaries: No contract_versions or contract_confirmations table; no legal signature engine; no confirmed mid-term amendment.
