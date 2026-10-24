# Coverage validation

Generated from the issue data and `docs/06-acceptance/traceability-matrix.md`. Every in-scope acceptance case is either owned by an issue or listed below as intentionally not planned, with the reason. Coverage means *planned*, not implemented.

Requirements the team dropped (audit log, async notifications, idempotency keys, OpenAPI, logging, monitoring, caching, media purge) are marked `Removed` in the docs and listed at the end; their acceptance cases were deleted from the docs.

## Summary
- Specification: 81 FR IDs (8 removed), 287 acceptance cases.
- In scope (P0/P1): 64 FRs, 265 acceptance cases.
- Planned in an issue: 265; intentionally not planned: 0; unexplained gaps: 0.
- Prototype flows mapped: 8 / 8; workflows mapped: 28 / 28.
- 22 issues; dependency graph acyclic (checked by the generator).

## Functional requirements (P0/P1)

| FR | Feature | Priority | Issues | Planned ACs |
|---|---|---|---|---|
| FR01 | Email registration | P0 Must | RENT-007 | 4/4 |
| FR02 | Email login and session refresh | P0 Must | RENT-007 | 4/4 |
| FR04 | Logout | P0 Must | RENT-007 | 3/3 |
| FR05 | Resource and admin authorization | P0 Must | RENT-001 | 4/4 |
| FR06 | Profile and dual dashboards | P0 Must | RENT-007 | 3/3 |
| FR43 | Verify the Supabase session on the server | P0 Must | RENT-001 | 3/3 |
| FR49 | Password reset and email confirmation | P0 Must | RENT-007 | 3/3 |
| FR07 | Create property draft without moderation | P0 Must | RENT-009 | 3/3 |
| FR08 | Manage and archive own property | P0 Must | RENT-009 | 4/4 |
| FR09 | Upload property and unit photos | P0 Must | RENT-011 | 3/3 |
| FR41 | Property and unit server actions | P0 Must | RENT-009, RENT-010 | 3/3 |
| FR50 | Create and bulk create units | P0 Must | RENT-010 | 4/4 |
| FR51 | Edit unit details and advertised terms | P0 Must | RENT-010 | 4/4 |
| FR52 | Manage operational status independently of availability | P0 Must | RENT-010 | 4/4 |
| FR55 | Track content revisions for property, unit and policy edits | P0 Must | RENT-009, RENT-011 | 3/3 |
| FR56 | Select reorder and remove gallery images | P0 Must | RENT-011 | 4/4 |
| FR57 | Update photos without a replacement-review workflow | P0 Must | RENT-011 | 4/4 |
| FR60 | Manage controlled property JSONB policies | P0 Must | RENT-009 | 4/4 |
| FR61 | Resolve unit policy overrides and additional rules | P0 Must | RENT-003, RENT-010, RENT-017 | 4/4 |
| FR87 | Manage consistent standard and custom amenities | P0 Must | RENT-002, RENT-003, RENT-009, RENT-010, RENT-014 | 10/10 |
| FR10 | Create property-level listing draft | P0 Must | RENT-012 | 4/4 |
| FR11 | Edit listing without reapproval after initial approval | P0 Must | RENT-012, RENT-014, RENT-015 | 4/4 |
| FR12 | Submit initial listing package | P0 Must | RENT-012 | 4/4 |
| FR13 | Review initial listing packages | P0 Must | RENT-014 | 3/3 |
| FR14 | Approve initial listing package | P0 Must | RENT-014 | 4/4 |
| FR15 | Reject initial listing with reason | P0 Must | RENT-014 | 3/3 |
| FR17 | Publish initially approved listing | P0 Must | RENT-012 | 4/4 |
| FR18 | Hide or archive listing | P0 Must | RENT-012 | 3/3 |
| FR78 | Suspend and restore listings after reports or inspection | P0 Must | RENT-015, RENT-016 | 5/5 |
| FR19 | Search listings by date-based availability | P0 Must | RENT-003 | 4/4 |
| FR20 | Filter eligible units for the full requested interval | P0 Must | RENT-003 | 4/4 |
| FR21 | Display listing details and eligible unit cards | P0 Must | RENT-003 | 4/4 |
| FR40 | Public listing reads | P0 Must | RENT-003 | 3/3 |
| FR77 | Calculate availability counts and rent ranges | P0 Must | RENT-003 | 4/4 |
| FR88 | Save and manage favourite properties | P0 Must | RENT-002, RENT-004 | 10/10 |
| FR25 | Submit rental request with contact details | P0 Must | RENT-005 | 5/5 |
| FR26 | Prevent duplicate pending rental requests | P0 Must | RENT-005 | 3/3 |
| FR27 | Tenant rental request dashboard | P0 Must | RENT-008 | 4/4 |
| FR28 | Withdraw pending rental request | P0 Must | RENT-019 | 3/3 |
| FR29 | Owner rental request inbox | P0 Must | RENT-013 | 4/4 |
| FR30 | Accept request when tenancy proposal commits | P0 Must | RENT-017 | 4/4 |
| FR31 | Reject pending rental request | P0 Must | RENT-019 | 3/3 |
| FR85 | Apply 15-day rejection using actual availability | P0 Must | RENT-019 | 8/8 |
| FR33 | Enforce nonoverlapping unit rental periods | P0 Must | RENT-002, RENT-017, RENT-020 | 5/5 |
| FR34 | Create tenancy proposal with temporary reservation | P0 Must | RENT-017 | 5/5 |
| FR35 | View tenancy timeline and contract versions | P0 Must | RENT-017 | 4/4 |
| FR42 | Rental request, tenancy and renewal server actions | P0 Must | RENT-017 | 4/4 |
| FR66 | Cancel proposals and end confirmed tenancies | P0 Must | RENT-017, RENT-021 | 5/5 |
| FR67 | Record original immutable agreement version | P0 Must | RENT-017 | 4/4 |
| FR71 | Keep immutable versions and effective agreement history | P0 Must | RENT-017 | 4/4 |
| FR75 | Transactional consistency | P0 Must | RENT-001, RENT-002 | 2/2 |
| FR80 | Confirm move-in after mutual contract confirmation | P0 Must | RENT-017 | 4/4 |
| FR81 | Confirm the exact contract version mutually | P0 Must | RENT-017, RENT-020 | 6/6 |
| FR82 | Decline and correct unconfirmed versions | P0 Must | RENT-017 | 5/5 |
| FR83 | Expire temporary confirmation reservations | P0 Must | RENT-018 | 4/4 |
| FR84 | Reserve renewal extension without releasing current occupancy | P0 Must | RENT-020 | 4/4 |
| FR86 | Enforce immutable contract terms and write-once confirmations | P0 Must | RENT-002 | 5/5 |
| FR68 | Submit one pending renewal request | P0 Must | RENT-020 | 4/4 |
| FR69 | Withdraw or reject pending renewal request | P0 Must | RENT-020 | 4/4 |
| FR70 | Propose renewal as new immutable version | P0 Must | RENT-020 | 6/6 |
| FR38 | Report public listing | P0 Must | RENT-006 | 5/5 |
| FR39 | Investigate reports and suspend listings | P0 Must | RENT-016 | 4/4 |
| FR72 | Reporter outcome and rate limits | P0 Must | RENT-006 | 4/4 |
| FR73 | In-app notifications | P1 Should | RENT-007 | 2/2 |

## Intentionally not planned

| Requirement | Acceptance cases | Reason |
|---|---|---|
| — | — | Nothing; every in-scope case is planned. |

## Removed by team decision

| FR | Feature |
|---|---|
| FR59 | Safely clean orphaned and deleted media |
| FR46 | Cache public listing content with fresh visibility checks |
| FR32 | Audit request and tenancy outcomes |
| FR74 | Idempotent writes |
| FR45 | Asynchronous domain notifications |
| FR44 | OpenAPI documentation |
| FR47 | Structured logs and critical alerts |
| FR48 | Development monitoring and slow query alerts |

## Deferred by product priority (P2/P3)

| FR | Feature | Priority |
|---|---|---|
| FR03 | Google sign in | P2 Defer |
| FR24 | Geocode address | P2 Defer |
| FR16 | Dedicated changes requested state | P2 Defer |
| FR22 | Interactive listing map | P2 Defer |
| FR23 | Synchronize map and filters | P2 Defer |
| FR36 | Submit tenancy based review | P2 Defer |
| FR37 | Display approved property reviews | P2 Defer |
| FR79 | Moderate optional property reviews | P2 Defer |
| FR76 | Deferred and excluded MVP scope | P3 Exclude |

## Prototype flows

| Flow | Name | Issues |
|---|---|---|
| F1 | Search and request | RENT-003, RENT-004, RENT-005, RENT-008 |
| F2 | Setup to publication | RENT-009, RENT-010, RENT-011, RENT-012, RENT-014, RENT-022 |
| F3 | Request to contract | RENT-013, RENT-017 |
| F4 | Decline and revise | RENT-017 |
| F5 | Deadline expiry | RENT-018 |
| F6 | Renewal | RENT-020 |
| F7 | Report and suspension | RENT-006, RENT-015, RENT-016 |
| F8 | Withdraw and reject requests | RENT-008, RENT-013, RENT-019 |

## Workflows

| Workflow | Issues |
|---|---|
| WF-01-create-property | RENT-009 |
| WF-02-create-units | RENT-010 |
| WF-03-create-listing | RENT-012 |
| WF-04-initial-listing-review | RENT-012, RENT-014 |
| WF-05-publish-listing | RENT-012 |
| WF-06-search-listings | RENT-003 |
| WF-07-submit-enquiry | RENT-005 |
| WF-08-discuss-reject-enquiry | RENT-013, RENT-019 |
| WF-09-create-tenancy-proposal | RENT-017 |
| WF-10-confirm-contract | RENT-017 |
| WF-11-correct-contract | RENT-017 |
| WF-12-request-renewal | RENT-020 |
| WF-13-propose-renewal | RENT-020 |
| WF-14-expire-reservation | RENT-018 |
| WF-15-auto-reject-enquiries | RENT-019 |
| WF-16-submit-listing-report | RENT-006 |
| WF-17-investigate-suspend | RENT-015, RENT-016 |
| WF-18-view-contract-history | RENT-017 |
| WF-19-save-remove-favourite | RENT-004 |
| WF-20-view-favourites | RENT-004 |
| WF-21-edit-property | RENT-009, RENT-010 |
| WF-22-update-media | RENT-011 |
| WF-23-manage-policies-amenities | RENT-009 |
| WF-24-withdraw-enquiry | RENT-019 |
| WF-25-record-move-in | RENT-017 |
| WF-26-end-cancel-tenancy | RENT-021 |
| WF-27-hide-archive-listing | RENT-012 |
| WF-28-authenticate-profile | RENT-001, RENT-007 |

## Workload (tentative estimates)

| Member | Issues | Days |
|---|---|---|
| Khai | 10 | 19 |
| Kien | 12 | 18.5 |
