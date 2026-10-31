CREATE TABLE "unit_media" (
    "unit_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_selected_for_listing" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_media_pkey" PRIMARY KEY ("unit_id", "media_id")
);

CREATE INDEX "unit_media_media_id_idx" ON "unit_media"("media_id");

ALTER TABLE "unit_media"
ADD CONSTRAINT "unit_media_unit_id_fkey"
FOREIGN KEY ("unit_id") REFERENCES "units"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_media"
ADD CONSTRAINT "unit_media_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "property_media"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Shared property images remain a single property_media/storage object.
-- Rows here only assign that existing image to a unit.
