<!-- rentos-task: RENT-002 -->
# RENT-002 · Database schema, integrity constraints, notifications helper and seed data

**Flow:** Shared foundation (Everyone)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 2.5 days (tentative)

## Outcome
One migration history creates every table the flows need, with the database rules that protect the important invariants, and one command seeds a demo world that matches the prototype story (owner Linh, tenant Mai, studios S201–S205).

## References
- **FR86** Enforce immutable contract terms and write-once confirmations · P0 Must (all ACs): FR86-AC01, FR86-AC02, FR86-AC03, FR86-AC04, FR86-AC05
- **FR33** Enforce nonoverlapping unit rental periods · P0 Must: FR33-AC02, FR33-AC03, FR33-AC05
- **FR87** Manage consistent standard and custom amenities · P0 Must: FR87-AC07
- **FR88** Save and manage favourite properties · P0 Must: FR88-AC04
- **FR75** Transactional consistency · P0 Must: FR75-AC03
- Modules: [M02](../../../docs/03-modules/M02-property-units-media/prd.md), [M03](../../../docs/03-modules/M03-listings-moderation/prd.md), [M04](../../../docs/03-modules/M04-discovery-favourites/prd.md), [M05](../../../docs/03-modules/M05-rental-requests/prd.md), [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md), [M07](../../../docs/03-modules/M07-renewals/prd.md), [M08](../../../docs/03-modules/M08-reports-admin/prd.md), [M09](../../../docs/03-modules/M09-notifications-audit/prd.md)

## Current repository evidence
- `prisma/schema.prisma` has only `UserProfile`; migration `20261023155000_user_profiles` adds the table and the `on_auth_user_created` trigger.
- No seed script.

## Scope and non-goals
**In scope:** Prisma models + SQL migration for properties, units, property_media, listings, rental_requests, tenancies, tenancy_contracts, tenancy_renewal_requests, listing_reports, favourite_properties, notifications; `createNotification(tx, …)` helper; `prisma/seed.ts`.

**Not in scope:** `notification_outbox`, `idempotency_records`, `audit_logs`, `property_reviews` (dropped or deferred).

## Implementation checklist
- [ ] UUID PKs, `timestamptz`, `NUMERIC(14,0)` VND, `DATE` rental boundaries; enums per `docs/02-domain/state-transition.md`
- [ ] JSONB defaults for amenities `{schema_version:1, standard:{}, custom:[]}`, policies, overrides
- [ ] Unique: unit label per property; one non-archived listing per property; one PENDING request per tenant/listing; one PENDING renewal per tenancy; one tenancy per request; `(tenancy_id, version_number)`; favourite pair; one open report per reporter/listing
- [ ] `btree_gist` EXCLUDE on `tenancies(unit_id, daterange(blocked_start_date, blocked_end_date + 1))` for PENDING_CONFIRMATION/CONFIRMED/ACTIVE
- [ ] Trigger: contract terms/hash cannot change; tenant confirm OR reject written once
- [ ] Composite FKs keep contract pointers inside their tenancy and media/cover/preferred unit inside their property
- [ ] Revoke `anon`/`authenticated` grants on business tables (all access goes through the server)
- [ ] `createNotification(tx, recipientId, title, body, link)` inserts into `notifications` inside the caller's transaction
- [ ] Seed: admin, owners, tenants; properties, units, photos; listings in every moderation/publication state; requests, tenancies and contracts in every state; reports; favourites. Re-runnable, fixed UUIDs for tests

## API and data contract
Columns per `docs/07-architecture/data-dictionary.md` minus the dropped tables. Khai writes all migrations; Kien requests changes on this issue or in review.

## Acceptance criteria
- [ ] `prisma migrate deploy` + `prisma db seed` work on an empty database, repeatedly
- [ ] Overlapping holds on one unit are rejected by the database; 30 Jun / 1 Jul adjacency is allowed
- [ ] Changing a submitted contract's rent or document hash is rejected; a second confirmation write is rejected
- [ ] Duplicate favourite / second current listing / second open report are rejected
- [ ] The browser key cannot read or write business tables
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
PostgreSQL integration test per constraint, including two connections inserting overlapping holds at once.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-001 · Project setup: CI, test runner and server access helpers (Khai)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: high · Estimate: 2.5 days (revise after starting)
- Labels: flow:foundation, module:M02, module:M03, module:M04, module:M05, module:M06, module:M07, module:M08, module:M09, priority:P0, risk:high, area:database

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-002-database-schema-seed` into `develop` references this issue and is approved by the reviewer
