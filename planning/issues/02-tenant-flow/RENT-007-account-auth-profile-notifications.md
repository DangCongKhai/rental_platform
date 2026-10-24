<!-- rentos-task: RENT-007 -->
# RENT-007 · Account: sign-in hardening, profile and notifications (S06, T07, T08)

**Flow:** Tenant flow (Tenant)  
**Owner:** Khai (@DangCongKhai) · **Reviewer:** Kien (@ndrhmdk) · **Estimate:** 1.5 days (tentative)

## Outcome
A user registers, confirms, logs in, recovers a password and logs out safely; edits their name and phone on “Hồ sơ cá nhân”; and sees an unread count on the navbar bell, the latest notifications in a dropdown and the full list on “Thông báo”.

## References
- **FR01** Email registration · P0 Must (all ACs): FR01-AC01, FR01-AC02, FR01-AC03, FR01-AC04
- **FR02** Email login and session refresh · P0 Must (all ACs): FR02-AC01, FR02-AC02, FR02-AC03, FR02-AC04
- **FR04** Logout · P0 Must (all ACs): FR04-AC01, FR04-AC02, FR04-AC03
- **FR49** Password reset and email confirmation · P0 Must (all ACs): FR49-AC01, FR49-AC02, FR49-AC03
- **FR06** Profile and dual dashboards · P0 Must (all ACs): FR06-AC01, FR06-AC02, FR06-AC03
- **FR73** In-app notifications · P1 Should (all ACs): FR73-AC01, FR73-AC02
- [Prototype](https://claude.ai/artifact/1E8CD1qFNEJRpUSVJ4kAqU): screens `S06-Auth`, `T07-Notifications`, `T08-Profile`, `Nav`, `NavStates`
- Modules: [M01](../../../docs/03-modules/M01-identity-access/prd.md), [M09](../../../docs/03-modules/M09-notifications-audit/prd.md)
- Workflows: [WF-28](../../../docs/04-workflows/WF-28-authenticate-profile.md)

## Current repository evidence
- Done in PR #2: `/auth/*` pages, sign-up with full name, wrong-password and unconfirmed states, logout.
- Missing: `supabase/config.toml` (deleted in commit 4b52e78) with redirect URLs, tests, profile page, bell and notifications page.

## Scope and non-goals
**In scope:** Auth hardening + tests, profile action and page, avatar menu items (Hồ sơ, Trang của bạn, Không gian quản lý), bell dropdown and notifications page reading the `notifications` table.

**Not in scope:** Google sign-in (P2).

## Implementation checklist
- [ ] Restore `supabase/config.toml` site URL and redirects; neutral messages for duplicate email and password reset
- [ ] Clear any user-specific client state on logout or account switch
- [ ] `updateProfile` accepts only `full_name` and `phone`; stale form (older `updated_at`) → “reload” message
- [ ] Notifications: own only, newest first, mark read / mark all read (safe to repeat), links go to app pages

## API and data contract
Server Actions `updateProfile`, `markNotificationRead`, `markAllNotificationsRead`; server reads `getMyNotifications()`, `getUnreadCount()`.

## Acceptance criteria
- [ ] Sign-up + email link → one auth user and one profile with `is_admin=false`
- [ ] After logout, protected pages redirect to login
- [ ] Trying to set `is_admin` through the profile form has no effect
- [ ] Marking read twice keeps one `read_at`; another user's notification is not visible
- [ ] Loading, empty, validation, unauthorized and failure states handled where the feature has UI or API

## Tests and evidence
Component tests for auth states and the bell; integration tests for profile field allowlist and notification privacy.
Record the command and result in the PR; do not claim results before running them.

## Dependencies
- RENT-002 · Database schema, integrity constraints, notifications helper and seed data (Khai)

## Ownership and review
- Owner: Khai (@DangCongKhai)
- Reviewer: Kien (@ndrhmdk)
- Risk: medium · Estimate: 1.5 days (revise after starting)
- Labels: flow:tenant, module:M01, module:M09, priority:P0, priority:P1, risk:medium, area:fullstack

## Definition of done
- [ ] Behaviour integrated in the app and reachable from the UI where applicable
- [ ] Tests listed above pass in CI
- [ ] OpenAPI, seed data and docs updated if routes, states or schema changed
- [ ] PR from `feat/rent-007-account-auth-profile-notifications` into `develop` references this issue and is approved by the reviewer
