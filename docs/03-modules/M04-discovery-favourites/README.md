# M04 Discovery and favourite properties

Owner: Khai. Reviewer: Kien.

Text/address search, same-unit filtering, date availability, public cards/details and private saved properties.

Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

Critical review focus: No private favourite data in shared output, no availability promises, correct unavailable placeholders.

Explicit boundaries: Maps deferred. Save properties, not listings/units. Favourites never allocate units or send enquiries.
