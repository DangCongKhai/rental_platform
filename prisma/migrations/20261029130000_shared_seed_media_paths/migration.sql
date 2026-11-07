-- Shared seed images are referenced by many property_media rows.
DROP INDEX "property_media_storage_path_key";

CREATE INDEX "property_media_storage_path_idx" ON "property_media"("storage_path");
