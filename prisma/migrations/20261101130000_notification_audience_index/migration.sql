-- Inbox queries filter one recipient by audience, newest first.
CREATE INDEX IF NOT EXISTS "notifications_recipient_id_audience_created_at_idx"
ON "notifications"("recipient_id", "audience", "created_at" DESC);
