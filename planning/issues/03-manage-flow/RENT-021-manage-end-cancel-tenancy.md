<!-- rentos-task: RENT-021 -->

# RENT-021 · Owner ends or cancels a tenancy (M13 actions)

**Flow:** Manage flow (Owner)  
**Owner:** Kien (@ndrhmdk) · **Reviewer:** Khai (@DangCongKhai) · **Estimate:** 1 day (tentative)

## Outcome

On M13 the owner cancels a confirmed tenancy before it starts, or records the actual end date with a reason, which also cancels any pending renewal and frees only the remaining dates.

## References

- **FR66** Cancel proposals and end confirmed tenancies · P0 Must: FR66-AC02, FR66-AC03, FR66-AC04, FR66-AC05
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): screens `M13-Tenancy`
- Modules: [M06](../../../docs/03-modules/M06-tenancies-contracts/prd.md)
- Workflows: [WF-26](../../../docs/04-workflows/WF-26-end-cancel-tenancy.md)

## Current repository evidence

- Not implemented.

## Scope and non-goals

**In scope:** Cancel and end actions and dialogs.

**Not in scope:** Automatic move-out when the date passes (not allowed).

## Implementation checklist

- [ ] Cancel: CONFIRMED and before start → CANCELLED with reason
- [ ] End: ACTIVE → ENDED with actual end date and reason; cancel pending renewal; shrink blocked dates
- [ ] Notify the tenant

## API and data contract

Server Actions `cancelTenancy(id, reason)`, `endTenancy(id, {actual_ended_at, reason})`.

## Acceptance criteria

- [ ] Early end frees later dates in search
- [ ] The request stays ACCEPTED in history
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests for allowed/refused state changes.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-017 · Contract flow: proposal, confirmation, decline, revision and move-in (F3 + F4) (Khai)
- RENT-020 · F6 · Tenancy renewal from request to confirmed extension (T05, T06, M15, T04) (Kien)

## Ownership and review

- Owner: Kien (@ndrhmdk)
- Reviewer: Khai (@DangCongKhai)
- Risk: high · Estimate: 1 day (revise after starting)
- Labels: flow:manage, module:M06, priority:P0, risk:high, area:fullstack

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-021-manage-end-cancel-tenancy` into `develop` references this issue and is approved by the reviewer
