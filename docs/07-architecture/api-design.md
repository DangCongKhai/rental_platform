# Server action contract

The app has no public REST API. Pages read data in server components, and every write is a Next.js Server Action. Each action resolves the user from the Supabase session, checks access on the server, validates input with a schema, runs in one database transaction, and inserts any notifications in that same transaction. Read the Server Functions guide in `node_modules/next/dist/docs/` before adding actions; this Next.js version differs from older releases.

Names below are the planned function names. They are targets, not verified existing code.

## Reads (server components)
| Function | Actor | Behavior |
| --- | --- | --- |
| `searchListings(filters)` | Public | Current visibility and full-interval, same-unit filters; paginated safe data |
| `getPublicListing(id, dates)` | Public | Hidden/suspended/unapproved listings are not found; no tenant contacts or private contracts |
| `getAmenityCatalog()` | Public | Code-managed stable catalog labels, aliases and scopes |
| `getMyProfile()` | Signed in | Own profile |
| `getMyProperties()`, `getMyProperty(id)`, `getUnits(propertyId)` | Owner | Own inventory only |
| `getMyRentalRequests()`, `getMyRentalRequest(id)`, `getMyTenancies()` | Tenant | Own requests and tenancies only |
| `getOwnerRequests(filters)`, `getOwnerRequest(id)`, `getOwnerOverview()` | Owner | Requests and summaries for managed properties only |
| `getTenancy(id)` | Tenancy parties | Agreement timeline and effective segment |
| `getContractDownloadUrl(contractId)` | Tenancy parties | Checks the party, then returns a short-lived signed Storage URL |
| `getMyFavourites()` | Signed in | Saved properties; unavailable ones as generic placeholders |
| `getMyReports()` | Reporter | Own reports with sanitized outcome |
| `getMyNotifications()`, `getUnreadCount()` | Signed in | Own notifications |
| `getReviewQueue()`, `getReviewPackage(id)`, `getAdminListings(filters)`, `getAdminReports(filters)`, `getAdminCounts()` | Admin | `is_admin` checked on the server |

## Actions (Server Actions)
| Action | Actor | Behavior |
| --- | --- | --- |
| `updateProfile` | Signed in | Only `full_name` and `phone`; stale form refused |
| `createProperty`, `updateProperty`, `archiveProperty` | Owner | WHOLE_SPACE creates its single unit; edits bump `content_revision`; archive keeps history |
| `createUnits(propertyId, rows[])`, `updateUnit` | Owner | All-or-nothing batch; whole-space guard; normalized labels unique per property |
| `uploadPhoto`, `updateGallery`, `removePhoto`, `replacePhoto` | Owner | Row created only after the file is stored; cover rules; soft delete |
| `saveListing`, `submitListing`, `publishListing`, `hideListing`, `archiveListing` | Owner | One current listing per property; first-review submission captures the content revision |
| `saveFavourite(propertyId)`, `removeFavourite(propertyId)` | Signed in | Desired state, safe to repeat; no toggle |
| `createRentalRequest(listingId, input)` | Tenant | Contact snapshots; PENDING; no hold; owner notified |
| `withdrawRequest(id, reason?)` | Tenant | PENDING → WITHDRAWN only |
| `rejectRequest(id, reason)` | Owner | Reason required; PENDING only |
| `proposeTenancy(requestId, input)` | Owner | Version 1 + owner confirmation + hold + request ACCEPTED in one transaction |
| `confirmContract(contractId, sha256)` | Tenant | Exact current version and hash, before the deadline, written once |
| `declineContract(contractId, reason)` | Tenant | Exact current version; releases the proposed hold |
| `reviseContract(tenancyId, input)` | Owner | New version linked to the old one; re-holds compatible dates |
| `recordMoveIn`, `cancelTenancy`, `endTenancy` | Owner | Explicit lifecycle changes with reasons |
| `requestRenewal`, `withdrawRenewal` | Tenant | One PENDING renewal per tenancy |
| `rejectRenewal`, `proposeRenewal` | Owner | Consecutive extension hold; request stays PENDING until the tenant confirms |
| `reportListing(listingId, input)` | Signed in | One open report per reporter/listing; simple per-user limit |
| `markNotificationRead`, `markAllNotificationsRead` | Recipient | Safe to repeat |
| `approveListing(id, expectedRevision)`, `rejectListing(id, reason)` | Admin | Exact submitted revision; reason required to reject |
| `suspendListing(id, reason)`, `restoreListing(id, reason)` | Admin | Separate restriction; restore never republishes |
| `startReview(id)`, `resolveReport(id, input)`, `dismissReport(id, reason)` | Admin | Reason required; optional suspension in the same transaction |

## Inputs and results
Actions never take the actor's id, `owner_id` or `is_admin` from input. Enquiry input: contact_name, contact_phone, desired_move_in_date, desired_end_date, message, optional preferred_unit_id. Contract proposal: unit and dates, monthly_rent, deposit_amount, agreed policies_snapshot, uploaded contract document (path + sha256), optional signed_on, explicit owner acknowledgement. Confirmation: the exact contract id and its document_sha256. Clients never send confirmation timestamps.

Every action returns `{ ok: true, data? }` or `{ ok: false, error, fieldErrors? }`. Use these error kinds consistently: not signed in, not found (also used instead of "forbidden" to avoid revealing records), conflict (stale or overlapping state, e.g. database 23505/23P01), validation, too many requests, and storage unavailable. Lists paginate and load related rows in one query.

## Time-based rules
Expired 48-hour holds and 15-day-old requests are handled lazily inside the actions and page loads above (see FR83 and FR85). No worker or scheduler is deployed.

## Fallback if synchronous processing is not enough
Only if a rule must run without a user action (for example, sending emails or expiring holds nobody opens), add a small Route Handler and let Supabase call it. There is still no separate worker to deploy:
- **Supabase Cron** (`pg_cron` + `pg_net`) sends a scheduled `POST` to `/api/cron/<job>` (e.g. `/api/cron/expire-holds`, `/api/cron/stale-requests`). The handler checks `Authorization: Bearer <CRON_SECRET>` and calls the same server function the actions use.
- **Supabase Database Webhooks** send a `POST` to `/api/webhooks/<event>` when a row is inserted (e.g. a new `notifications` row, to send an email). The handler checks a shared secret header and must be safe to call twice for the same row.

`CRON_SECRET` and webhook secrets live in server environment variables and Supabase Vault, never in the browser.
