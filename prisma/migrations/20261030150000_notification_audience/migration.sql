-- Audience is explicit event metadata; neither recipient role nor resource type identifies it.
ALTER TABLE notifications ADD COLUMN audience TEXT;
-- These are the two existing seed events. Unknown legacy events require an explicit mapping.
UPDATE notifications SET audience = 'OWNER' WHERE event_key LIKE 'seed:proposal:%';
UPDATE notifications SET audience = 'TENANT' WHERE event_key LIKE 'seed:active:%';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM notifications WHERE audience IS NULL) THEN
    RAISE EXCEPTION 'Unmapped notification audiences: add an explicit event-key backfill before applying this migration';
  END IF;
END $$;
ALTER TABLE notifications ALTER COLUMN audience SET NOT NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_audience_check CHECK (audience IN ('TENANT', 'OWNER', 'ADMIN'));
CREATE INDEX notifications_recipient_id_audience_created_at_idx ON notifications(recipient_id, audience, created_at DESC);
