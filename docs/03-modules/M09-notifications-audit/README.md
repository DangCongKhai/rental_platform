# M09 Notifications
 Owner: Khai. Reviewer: Kien.

 In-app notifications inserted by each action in its own transaction, and a private inbox with read state.

 Read [PRD](prd.md), [business rules](../../02-domain/business-rules.md), [state transitions](../../02-domain/state-transition.md), and the [action contract](../../07-architecture/api-design.md). Check the existing code before creating issues; the backlog is in [`planning/`](../../../planning/issue-plan.md).

 Critical review focus: No notice for a rolled-back action; private links.

 Explicit boundaries: No viewing reminders, outbox or worker. Optional email later via a Supabase Database Webhook calling a protected Route Handler.
