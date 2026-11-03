<!-- rentos-task: RENT-005 -->

# RENT-005 · Send a rental request from a listing (S03 → S06 → S04)

**Flow:** Public & auth flow (Guest / signed-in user)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1.5 days (tentative)

## Outcome

From a listing, a visitor presses “Gửi yêu cầu thuê”; a guest signs in and comes back to the listing; the form takes contact name, phone, desired dates, optional preferred unit and a message; on success the request is PENDING, the owner gets a notification, and no unit is reserved.

## References

- **FR25** Submit rental request with contact details · P0 Must (all ACs): FR25-AC01, FR25-AC02, FR25-AC03, FR25-AC04, FR25-AC05
- **FR26** Prevent duplicate pending rental requests · P0 Must (all ACs): FR26-AC01, FR26-AC02, FR26-AC03
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): flows F1 Search and request; screens `S03-Listing`, `S06-Auth`, `S04-Request`, `Mob-S04`
- Modules: [M05](../../../docs/03-modules/M05-rental-requests/prd.md)
- Workflows: [WF-07](../../../docs/04-workflows/WF-07-submit-enquiry.md)

## Current repository evidence

- Login always returns to `/`; no request form or action.

## Scope and non-goals

**In scope:** Safe `?next=` return after login, S04 form page (full screen on mobile), `createRentalRequest` action, success state linking to T03.

**Not in scope:** Tenant request pages (RENT-008), owner inbox (RENT-013), withdraw/reject (RENT-019).

## Implementation checklist

- [ ] Login/sign-up honour `?next=` for same-origin paths only
- [ ] Validate phone format, dates (≥ 3 months, end after start), preferred unit belongs to the property, not your own listing
- [ ] Store contact name/phone as a snapshot; status PENDING; `createNotification` for the owner in the same transaction
- [ ] Existing PENDING request for the same listing → show a link to it instead of a second one
- [ ] Prefill from profile

## API and data contract

Server Action `createRentalRequest(listingId, {contact_name, contact_phone, desired_move_in_date, desired_end_date, preferred_unit_id?, message})`.

## Acceptance criteria

- [ ] Guest → login → back on the listing → S04 → PENDING request, owner notified
- [ ] Own listing or unit from another property → field error
- [ ] Two quick submissions → one request
- [ ] Changing profile phone later leaves the request's phone unchanged
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence

Integration tests for duplicate prevention and snapshot; component test for validation.
Record the command and result in the PR; do not claim results before running them.

## Dependencies

- RENT-003 · Browse, search by dates and view listing details (S01, S02, S03, S08, S09) (Khai)

## Ownership and review

- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: high · Estimate: 1.5 days (revise after starting)
- Labels: flow:public, module:M05, priority:P0, risk:high, area:fullstack

## Definition of done

- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-005-send-rental-request` into `develop` references this issue and is approved by the reviewer
