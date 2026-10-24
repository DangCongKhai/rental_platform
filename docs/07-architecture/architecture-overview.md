# Architecture overview
Next.js serves the UI and all server logic. Server components read data; Server Actions perform every write. Both call shared server functions in `src/server/` that own proposals, confirmation, renewal, expiry, 15-day decisions, initial moderation and visibility.

Each write runs in one database transaction that re-reads and locks the rows it changes, then relies on database constraints (unique, exclusion, triggers) as the final guard. Notifications are inserted in the same transaction, so a rolled-back action never leaves a notice behind. Availability is a query, never a stored counter. Photo and contract files are uploaded before their rows are written; a failed upload leaves no row.

Time-based rules (hold expiry, 15-day auto-rejection) run lazily when a record is opened or acted on. If a rule ever needs to run on its own, Supabase Cron or a Database Webhook calls a protected Route Handler that reuses the same server function (see [API contract](api-design.md)). No long-running worker is deployed.

Search results are indicative; the proposal action rechecks availability under lock. User-specific data (favourites, requests, contracts) is never rendered into shared or static output, and client state is cleared on logout. Khai writes the database migrations; the flow owner writes the server functions for their flow.
