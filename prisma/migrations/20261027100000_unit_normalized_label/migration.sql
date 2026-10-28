ALTER TABLE "units"
ADD COLUMN "normalized_label" TEXT;

UPDATE "units"
SET "normalized_label" = lower(regexp_replace(normalize(btrim("label"), NFC), '\s+', ' ', 'g'));

ALTER TABLE "units"
ALTER COLUMN "normalized_label" SET NOT NULL;

ALTER TABLE "units"
ADD CONSTRAINT "units_property_normalized_label_key"
UNIQUE ("property_id", "normalized_label");