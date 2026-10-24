# Team ownership
Two members, each owning complete actor flows from the prototype. The detailed backlog is in [`planning/issue-plan.md`](../../planning/issue-plan.md).

| Member | Owns | Reviews |
|---|---|---|
| Khai | Shared foundation (setup, schema, seed), public & auth flow (S01–S09), tenant flow (T01–T09), contract flow (F3 + F4), deadline expiry (F5) | All of Kien's PRs; every migration |
| Kien | Manage/owner flow (M01–M15), admin flow (A01–A06), withdraw/reject/15-day auto-reject (F8), renewal (F6) | All of Khai's PRs |

Khai writes all database migrations; Kien requests schema changes in the issue or in review. Admin screens are never the authorization boundary: every admin action checks `is_admin` on the server. Both members write their own commits and PRs.

## Dependency order
Setup and schema → search/detail and owner inventory in parallel → listing review and publication → rental requests → contract flow → expiry, withdraw/reject and renewal → tenancy close-out and overview. Admin review can start against seeded data before owner submission exists.
