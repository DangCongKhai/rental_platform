<!-- rentos-task: RENT-014 -->

# RENT-014 · Admin dashboard and first review of listing packages (A01, A02, A03)

**Flow:** Admin flow (Admin)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 2 days (tentative)

## Outcome

An admin opens “Bảng điều khiển Admin” from the avatar menu, sees queue and report counts, opens the moderation queue, reviews one pending package (listing, property, units, photos, rules, owner) on one screen, and approves it or rejects it with a reason.

## References

- **FR13** Review initial listing packages · P0 Must (all ACs): FR13-AC01, FR13-AC02, FR13-AC03
- **FR14** Approve initial listing package · P0 Must (all ACs): FR14-AC01, FR14-AC02, FR14-AC03, FR14-AC04
- **FR15** Reject initial listing with reason · P0 Must (all ACs): FR15-AC01, FR15-AC02, FR15-AC03
- **FR11** Edit listing without reapproval after initial approval · P0 Must: FR11-AC02
- **FR87** Manage consistent standard and custom amenities · P0 Must: FR87-AC09
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F2 Setup to publication; screens `AdminHeader`, `AdminSidebar`, `A01-Dashboard`, `A02-Queue`, `A03-Review`
- Modules: [M03](../../../docs/03-modules/M03-listings-moderation/prd.md), [M08](../../../docs/03-modules/M08-reports-admin/prd.md)
- Workflows: [WF-04](../../../docs/04-workflows/WF-04-initial-listing-review.md)

## Current repository evidence

- No admin area.

## Scope and non-goals

**In scope:** Admin layout (dark header, sidebar, desktop only) protected by `requireAdmin`, dashboard counts, queue, review page, approve/reject actions, admin link in the avatar menu for admins.

**Not in scope:** Reports (RENT-016), suspension (RENT-015).

## Implementation checklist

- [ ] `/admin` returns not found for non-admins (server check)
- [ ] Queue: PENDING only, oldest first, paginated, empty/loading/error states
- [ ] Approve only if the property's `content_revision` still equals `submitted_content_revision`; otherwise “content changed, reload”
- [ ] Approve sets APPROVED + reviewer + time; it does not publish
- [ ] Reject needs a reason; owner sees it and gets a notification
- [ ] Second admin deciding the same package → “already decided” message

## API and data contract

Server Actions `approveListing(id, expectedRevision)`, `rejectListing(id, reason)`; server reads `getReviewQueue()`, `getReviewPackage(id)`, `getAdminCounts()`.

## Acceptance criteria

- [ ] All linked content visible on one screen
- [ ] Non-admin cannot open the page or call the actions
- [ ] Owner edit after the admin opened the package → approve refused
- [ ] Empty reason → field error
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Built first against seeded PENDING listings. Integration tests for admin check and stale approval.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-002 · Database schema, integrity constraints, notifications helper and seed data (Khai)
- Note: Build against seeded PENDING listings; connect to real submissions once RENT-012 merges.

## Ownership and review

- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: high · Estimate: 2 days (revise after starting)
- Labels: flow:admin, module:M03, module:M08, priority:P0, risk:high, area:fullstack, area:admin

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-014-admin-dashboard-first-review` into `develop` references this issue and is approved by the reviewer
