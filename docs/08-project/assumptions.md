# Explicit assumptions
- The stack is Next.js (server components + Server Actions) with Supabase PostgreSQL, Auth and Storage.
- Processing is synchronous. Time-based rules run lazily; Supabase Cron or Database Webhooks calling a protected Route Handler are the fallback, never a separate worker.
- Favourites are private, signed-in, property-level saves. No guest persistence or automatic save after login. The count includes saved rows shown as unavailable placeholders.
- The 48-hour confirmation hold is a configurable default. The 15-day rule rejects only when the request is at least 15 days old AND no unit can cover the whole requested period; the preferred unit is a soft preference.
- Team: Khai and Kien. Real remaining time and hosting are decided by the team.
