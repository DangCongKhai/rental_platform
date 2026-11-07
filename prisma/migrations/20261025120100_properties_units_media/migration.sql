CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "rental_arrangement" TEXT NOT NULL,
    "address_line" TEXT,
    "ward" TEXT,
    "city" TEXT,
    "description" TEXT,
    "shared_amenities" JSONB NOT NULL DEFAULT '{"schema_version":1,"standard":{},"custom":[]}',
    "policies" JSONB NOT NULL DEFAULT '{"schema_version":1,"defaults":{"pets":"ASK_OWNER","smoking":"NOT_ALLOWED"},"shared_rules":[]}',
    "content_revision" INTEGER NOT NULL DEFAULT 1,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "unit_kind" TEXT NOT NULL,
    "description" TEXT,
    "floor" TEXT,
    "area_m2" DECIMAL(8,2),
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(4,1) NOT NULL,
    "bathroom_arrangement" TEXT NOT NULL,
    "amenities" JSONB NOT NULL DEFAULT '{"schema_version":1,"standard":{},"custom":[]}',
    "advertised_monthly_rent" DECIMAL(14,0),
    "deposit" DECIMAL(14,0),
    "minimum_rental_months" INTEGER NOT NULL,
    "max_occupants" INTEGER,
    "operational_status" TEXT NOT NULL DEFAULT 'READY',
    "is_marketed" BOOLEAN NOT NULL DEFAULT false,
    "policy_overrides" JSONB NOT NULL DEFAULT '{}',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_selected_for_listing" BOOLEAN NOT NULL DEFAULT true,
    "purged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "sha256" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "property_media_storage_path_key" ON "property_media"("storage_path");
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");
CREATE INDEX "units_property_id_idx" ON "units"("property_id");
CREATE INDEX "property_media_property_id_idx" ON "property_media"("property_id");
CREATE INDEX "property_media_unit_id_idx" ON "property_media"("unit_id");

ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user_profiles"("id");
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id");
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user_profiles"("id");

ALTER TABLE properties ADD CONSTRAINT properties_type_check
  CHECK (property_type IN ('HOUSE', 'APARTMENT', 'APARTMENT_BUILDING'));
ALTER TABLE properties ADD CONSTRAINT properties_arrangement_check
  CHECK (rental_arrangement IN ('WHOLE_SPACE', 'SEPARATE_UNITS'));
ALTER TABLE properties ADD CONSTRAINT properties_latitude_check
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE properties ADD CONSTRAINT properties_longitude_check
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE units ADD CONSTRAINT units_kind_check
  CHECK (unit_kind IN ('ROOM', 'STUDIO', 'APARTMENT', 'HOUSE'));
ALTER TABLE units ADD CONSTRAINT units_bathroom_check
  CHECK (bathroom_arrangement IN ('PRIVATE', 'SHARED'));
ALTER TABLE units ADD CONSTRAINT units_status_check
  CHECK (operational_status IN ('READY', 'MAINTENANCE', 'RETIRED'));
ALTER TABLE units ADD CONSTRAINT units_bedrooms_check CHECK (bedrooms >= 0);
ALTER TABLE units ADD CONSTRAINT units_bathrooms_check CHECK (bathrooms >= 0);
ALTER TABLE units ADD CONSTRAINT units_area_check CHECK (area_m2 IS NULL OR area_m2 > 0);
ALTER TABLE units ADD CONSTRAINT units_rent_check
  CHECK (advertised_monthly_rent IS NULL OR advertised_monthly_rent > 0);
ALTER TABLE units ADD CONSTRAINT units_deposit_check
  CHECK (deposit IS NULL OR deposit >= 0);
ALTER TABLE units ADD CONSTRAINT units_term_check CHECK (minimum_rental_months >= 3);
ALTER TABLE units ADD CONSTRAINT units_occupants_check
  CHECK (max_occupants IS NULL OR max_occupants > 0);
ALTER TABLE units ADD CONSTRAINT units_label_check
  CHECK (label = btrim(label) AND length(label) > 0);

ALTER TABLE property_media ADD CONSTRAINT property_media_size_check CHECK (size_bytes > 0);
