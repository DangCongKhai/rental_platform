<!-- rentos-task: RENT-017 -->
# RENT-017 · Contract flow: proposal, confirmation, decline, revision and move-in (F3 + F4)

**Flow:** Tenant ↔ owner shared flows (Tenant + owner)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 4.5 days (tentative)

## Outcome
From a pending request the owner fills the 4-step proposal (unit, dates and money, agreed rules, contract PDF) and confirms it; the request becomes ACCEPTED and the unit is held with a 48-hour countdown. The tenant opens T04, downloads the contract and either confirms that exact version (tenancy CONFIRMED) or declines with a reason (hold released, “Đang chờ phiên bản sửa đổi”). After a decline the owner sends version 2 on M14 for the tenant to confirm. Both sides see the full history on M13 / T05, and the owner records move-in.

## References
- **FR30** Accept request when tenancy proposal commits · P0 Must (all ACs): FR30-AC01, FR30-AC02, FR30-AC03, FR30-AC04
- **FR34** Create tenancy proposal with temporary reservation · P0 Must (all ACs): FR34-AC01, FR34-AC02, FR34-AC03, FR34-AC04, FR34-AC05
- **FR67** Record original immutable agreement version · P0 Must (all ACs): FR67-AC01, FR67-AC02, FR67-AC03, FR67-AC04
- **FR35** View tenancy timeline and contract versions · P0 Must (all ACs): FR35-AC01, FR35-AC02, FR35-AC03, FR35-AC04
- **FR71** Keep immutable versions and effective agreement history · P0 Must (all ACs): FR71-AC01, FR71-AC02, FR71-AC03, FR71-AC04
- **FR80** Confirm move-in after mutual contract confirmation · P0 Must (all ACs): FR80-AC01, FR80-AC02, FR80-AC03, FR80-AC04
- **FR81** Confirm the exact contract version mutually · P0 Must: FR81-AC01, FR81-AC02, FR81-AC03, FR81-AC04, FR81-AC05
- **FR82** Decline and correct unconfirmed versions · P0 Must (all ACs): FR82-AC01, FR82-AC02, FR82-AC03, FR82-AC04, FR82-AC05
- **FR42** Rental request, tenancy and renewal server actions · P0 Must (all ACs): FR42-AC01, FR42-AC02, FR42-AC03, FR42-AC04
- **FR33** Enforce nonoverlapping unit rental periods · P0 Must: FR33-AC01
- **FR61** Resolve unit policy overrides and additional rules · P0 Must: FR61-AC03
- **FR66** Cancel proposals and end confirmed tenancies · P0 Must: FR66-AC01
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F3 Request to contract, F4 Decline and revise; screens `M12-Proposal`, `Mob-M12`, `M13-Tenancy`, `M14-Revise`, `T04-Review`, `Mob-T04`, `T05-Tenancy`, `States-Conflicts`
- Modules: [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md), [M05](../../../docs/03-modules/M05-rental-requests/prd.md)
- Workflows: [WF-09](../../../docs/04-workflows/WF-09-create-tenancy-proposal.md), [WF-10](../../../docs/04-workflows/WF-10-confirm-contract.md), [WF-11](../../../docs/04-workflows/WF-11-correct-contract.md), [WF-18](../../../docs/04-workflows/WF-18-view-contract-history.md), [WF-25](../../../docs/04-workflows/WF-25-record-move-in.md)

## Current repository evidence
- Not implemented.

## Scope and non-goals
**In scope:** Proposal, confirm, decline, revise and move-in actions; private `contracts` bucket via RENT-011's upload service; signed download link after a party check; M12 form, T04 review page with countdown, M14 revision form, tenancy detail for both parties (M13 / T05).

**Not in scope:** Deadline expiry handling (RENT-018), renewal (RENT-020), end/cancel (RENT-021).

## Implementation checklist
- [ ] Upload the contract PDF first; store its sha256 and private path
- [ ] Proposal (one transaction): request still PENDING, unit READY, ≥ 3 calendar months, rent > 0, deposit ≥ 0; release expired holds on the unit (RENT-018 helper); insert tenancy with blocked dates and `confirmation_expires_at` (default 48h, configurable), version 1 with agreed rules and `owner_confirmed_at`; request → ACCEPTED; notify tenant
- [ ] Overlap rejected by the database → “Căn đã được giữ cho khoảng thời gian này”
- [ ] Confirm: only the current pending version, matching hash, before the deadline → `tenant_confirmed_at`, confirmed dates set, deadline cleared; notify owner
- [ ] Decline: reason required → `tenant_rejected_at`, hold released, AWAITING_REVISION; notify owner
- [ ] Revise: only before both confirmed; new version number linked to the old one; owner confirms; dates re-held if still free
- [ ] Tenancy detail: all versions with each side's decision; current terms only from confirmed versions; proposed terms labelled
- [ ] Move-in: CONFIRMED and start date reached → ACTIVE; never automatic

## API and data contract
Server Actions `proposeTenancy(requestId, input)`, `confirmContract(contractId, sha256)`, `declineContract(contractId, reason)`, `reviseContract(tenancyId, input)`, `recordMoveIn(tenancyId)`; server reads `getTenancy(id)`, `getContractDownloadUrl(contractId)`.

## Acceptance criteria
- [ ] Valid proposal → PENDING_CONFIRMATION, request ACCEPTED, owner confirmed v1
- [ ] Overlapping hold → refused, nothing saved
- [ ] Under 3 months (month-end and leap-year cases) → field error
- [ ] Tenant confirms v1 → CONFIRMED; confirming an old version or wrong hash → refused
- [ ] Decline keeps v1 and frees the dates; v2 needs a new tenant confirmation
- [ ] Revision after both confirmed → refused
- [ ] Unrelated user cannot download the contract
- [ ] Move-in before start or on an unconfirmed tenancy → refused
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Integration tests per acceptance case, including two proposals for the same unit at once; unit tests for the calendar-month rule and current-terms resolver.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-013 · Owner rental request inbox (M10, M11) (Kien)
- RENT-008 · Tenant home and rental request tracking (T01, T02, T03) (Khai)
- RENT-011 · Owner uploads and manages property and unit photos with Supabase Storage (M06) (Kien)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: critical · Estimate: 4.5 days (revise after starting)
- Labels: flow:shared, module:M06, module:M05, priority:P0, risk:critical, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-017-contract-proposal-decline-revise` into `develop` references this issue and is approved by the reviewer
