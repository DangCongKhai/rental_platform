# Security design

The server identifies the user only through the Supabase session (`supabase.auth.getClaims()` via `@supabase/ssr`), which verifies the token. The verified `sub` maps to `user_profiles.user_id`; disabled accounts are refused. `is_admin` is server data only. Owner and tenant identities on a tenancy decide who may confirm, decline or manage it.

Every write is a Server Action. Next.js Server Actions only accept same-origin requests, which protects these cookie-authenticated writes against CSRF. Any Route Handler (only the optional cron/webhook endpoints) checks a secret header and is never called from the browser.

Inventory protection uses database constraints, not disabled buttons. Contract files and storage paths are private and immutable; image type is checked from file content, not the extension. Escape user text to prevent XSS, use parameterized queries, and validate JSON keys against allowlists.

Clear user-specific client state on logout and account switch. No tenant contacts, report internal notes, document links, service keys or secrets in public pages or logs. Saved favourites whose target became hidden show only the saved relation and a generic unavailable status, never the hidden title, photo, address or moderation reason.
