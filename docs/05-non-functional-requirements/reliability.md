# Reliability

Each action changes its business rows and inserts its notifications in one transaction, so either everything commits or nothing does. Files are uploaded before their rows are written; a failed upload leaves no row. Time-based rules are applied lazily and must be safe to run more than once: releasing an already released hold or re-checking an already rejected request changes nothing. If a Supabase Cron job or Database Webhook is added later, its Route Handler must be equally safe to call twice. Test database conflicts (unique violations, 23P01 overlaps) and storage failures.
