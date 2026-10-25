CREATE TABLE "listing_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution_summary" TEXT,
    "internal_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_reports_listing_id_idx" ON "listing_reports"("listing_id");
CREATE INDEX "listing_reports_reporter_id_idx" ON "listing_reports"("reporter_id");

ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id");
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user_profiles"("id");
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user_profiles"("id");

ALTER TABLE listing_reports ADD CONSTRAINT listing_reports_reason_check
  CHECK (reason_code IN ('FRAUD', 'MISLEADING', 'HARMFUL', 'OTHER'));
ALTER TABLE listing_reports ADD CONSTRAINT listing_reports_status_check
  CHECK (status IN ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'));
ALTER TABLE listing_reports ADD CONSTRAINT listing_reports_outcome_check
  CHECK (
    status NOT IN ('RESOLVED', 'DISMISSED')
    OR (resolution_summary IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  );

CREATE TABLE "favourite_properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favourite_properties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favourite_properties_user_id_property_id_key" ON "favourite_properties"("user_id", "property_id");
CREATE INDEX "favourite_properties_user_pagination" ON "favourite_properties"("user_id", "created_at" DESC, "id" DESC);

ALTER TABLE "favourite_properties" ADD CONSTRAINT "favourite_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id");
ALTER TABLE "favourite_properties" ADD CONSTRAINT "favourite_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_recipient_id_event_key_key" ON "notifications"("recipient_id", "event_key");
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at" DESC);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user_profiles"("id");
