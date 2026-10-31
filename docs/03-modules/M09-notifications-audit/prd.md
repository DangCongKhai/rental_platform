# M09 Product requirements

## Purpose

In-app notifications inserted synchronously by each action, and a private inbox with read state.

## Actors and permissions

Use server access checks from each FR below. UI guards never replace server checks.

## Functional requirements

### FR45 Asynchronous domain notifications

Priority: Removed (was Removed (was P1 Should)). Actors: System.

Removed by team decision: Replaced by synchronous notifications: each action inserts its `notifications` rows in its own transaction (see FR73 and ADR-004). The ID is kept and not reused.

### FR73 In-app notifications

Priority: P1 Should. Actors: User. Dependencies: Shared identity/resource foundation.

Factors: Recipient isolation; repeat-safe read state

Tools: Next.js + React + Tailwind + Server Actions + server validation + server access checks + Supabase PostgreSQL + notifications

Each action inserts in-app notifications in its own transaction, with safe links and unread/read state per recipient. Links navigate through authorized application pages, not permanent document URLs.

Acceptance criteria:

- FR73-AC01 [Positive] User marks own notification read twice → One read_at; no duplicate rows.
- FR73-AC02 [Security] Other user reads/marks it → Not found.

## Data and API boundary

Use the shared data dictionary and the server action contract in `07-architecture/api-design.md`; do not invent tables/enums to suit one screen. Every issue names the actions, schema fields and stale-state behavior it changes.

## Failure and concurrency

No notice for a rolled-back action (the insert shares the action's transaction); private links. Ordinary permission/validation/empty/network states are part of completion, alongside the specific race cases above. PostgreSQL invariants require real database tests.

## Definition of done

UI and server actions integrated; unit and integration tests; public pages expose no private data; docs synchronized; issue-linked PR and reviewer evidence. No implementation is claimed here.

## Out of scope

No viewing reminders, outbox or worker. Email delivery is optional; if added later, call the provider after commit, and use a Supabase Cron job hitting a protected Route Handler only if retries are needed.
