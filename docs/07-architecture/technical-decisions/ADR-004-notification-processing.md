# Durable after-commit notifications

Status: specified design, implementation unverified.

Decision: Store outbox intent atomically with domain/audit; a database-backed queue plus a Next.js worker and scheduler for MVP. Retry/dedupe and redacted failures; delivery outage does not roll back committed domain result.

Consequences: tests and issue acceptance must reference this behavior; record any approved change here and update affected PRDs/workflows/data/API/acceptance together.
