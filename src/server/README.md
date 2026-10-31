# Server helpers

Server Actions identify the user, check access, validate input, and return one result shape. The actor always comes from the server.

## Result

`ActionResult<T>` is `{ ok: true, data?: T }` or `{ ok: false, error, fieldErrors? }`.

`runAction` turns `ActionError` into the failure shape. A Next.js `redirect()` still leaves the action, so a signed-out user can be sent to `/auth/login`.

## Access

`requireUser()` reads `supabase.auth.getClaims()`, loads `user_profiles` by that `user_id`, and redirects to `/auth/login` when there is no session or no profile. `SUSPENDED` is refused. `is_admin` comes from the profile row, never from the token or the form.

`requireAdmin()` refuses anyone whose profile is not an admin.

`requireOwner(propertyId)` and `requireParty(tenancyId)` compare `user_profiles.id` with `properties.owner_id`, or with the tenancy's `owner_id` and `tenant_id`. A missing row and the wrong person both fail with “Không tìm thấy dữ liệu.” Those tables are added in RENT-002. No page calls these two helpers yet.

## Forms

`parseForm(schema, formData)` checks the form with Zod and returns the first message for each field in Vietnamese. If `user_id`, `owner_id`, or `is_admin` is present, those fields are rejected and the schema does not see them.

## Transactions and cron

`withTransaction` commits only when the callback resolves. Later actions use it so a failed write rolls back.

`createNotification(tx, { recipientId, audience, eventKey, title, body, link })` inserts one `notifications` row on the transaction passed in. `link` is `{ resourceType, resourceId }`. The same pair cannot be inserted twice. Call it from inside `withTransaction` together with the business write. RENT-002 has no page, so there is no loading, empty, or validation UI to exercise.

`withRolledBackTransaction` always rolls the transaction back. The integration test runs only when `DATABASE_URL` is set, against local Supabase:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm test
```

CI does not start Postgres and does not run `prisma migrate deploy`. The profile migration references `auth.users`, which a stock Postgres service does not have.

A Supabase Cron or webhook Route Handler calls `assertCronRequest(request)`. The request must send `Authorization: Bearer <CRON_SECRET>`. Anything else gets 401. This issue does not add a cron route.
