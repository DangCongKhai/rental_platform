# Synchronous notifications, with Supabase-triggered fallback

Status: accepted for this project.

Decision: Each action inserts its in-app `notifications` rows in the same database transaction as the business change. There is no outbox, queue, worker or scheduler. Time-based rules (48-hour hold expiry, 15-day auto-rejection) run lazily when a record is opened or acted on.

Fallback, only if synchronous processing turns out to be insufficient (for example, sending emails or expiring holds nobody opens): use Supabase Cron (`pg_cron` + `pg_net`) to `POST` to a protected Route Handler such as `/api/cron/expire-holds`, or a Supabase Database Webhook to `POST` to `/api/webhooks/<event>` on row insert. Handlers check a secret header, call the same server functions as the actions, and are safe to run twice. Do not deploy a separate long-running worker.

Consequences: a rolled-back action never leaves a notice. Email or other external delivery, if added, happens after commit and may be retried by the webhook; failures there never undo the business change.
