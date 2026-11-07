-- Owner property lists filter by owner and archive flag,
-- then sort by newest update.
CREATE INDEX IF NOT EXISTS "properties_owner_list_idx"
ON "properties"(
  "owner_id",
  "archived_at",
  "updated_at" DESC,
  "id" DESC
);
