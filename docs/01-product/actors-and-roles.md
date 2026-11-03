# Actors and roles

| Actor              | Allowed responsibility                                                             | Boundary                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Guest              | Public visible listing discovery                                                   | Cannot persist favourites, submit enquiries/reports or read private records                                                     |
| Authenticated user | Own profile and favourites                                                         | Actor derived from the verified session; no user_id impersonation                                                               |
| Tenant             | Own enquiries, related tenancy contracts, renewal requests                         | Cannot edit owner-submitted terms in place                                                                                      |
| Owner              | Own properties/units/media/listings and related enquiries/proposals                | Ownership relationship, not a global role selected at signup                                                                    |
| Admin              | First listing review, reports, suspension/restoration                              | is_admin is trusted server data; cannot acknowledge contracts on behalf of parties                                              |
| System             | Availability queries, lazy hold expiry and 15-day evaluation, notification inserts | Runs inside user actions and page loads with the same invariants; optional Supabase Cron/Webhook calls reuse the same functions |

A single normal profile may own and rent. Frontend route guards improve UX. Server access checks run on every private read, action and download.
