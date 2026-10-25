CREATE TABLE "listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_media_id" UUID,
    "moderation_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publication_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_reason" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_content_revision" INTEGER,
    "approved_content_revision" INTEGER,
    "admin_suspended_at" TIMESTAMPTZ(6),
    "admin_suspended_by" UUID,
    "suspension_reason" TEXT,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listings_property_id_idx" ON "listings"("property_id");
CREATE INDEX "listings_cover_media_id_idx" ON "listings"("cover_media_id");

ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "property_media"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user_profiles"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_admin_suspended_by_fkey" FOREIGN KEY ("admin_suspended_by") REFERENCES "user_profiles"("id");

ALTER TABLE listings ADD CONSTRAINT listings_moderation_check
  CHECK (moderation_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE listings ADD CONSTRAINT listings_publication_check
  CHECK (publication_status IN ('DRAFT', 'PUBLISHED', 'HIDDEN'));
ALTER TABLE listings ADD CONSTRAINT listings_rejection_reason_check
  CHECK (moderation_status <> 'REJECTED' OR (review_reason IS NOT NULL AND length(btrim(review_reason)) > 0));
ALTER TABLE listings ADD CONSTRAINT listings_suspension_check
  CHECK (
    (admin_suspended_at IS NULL AND admin_suspended_by IS NULL AND suspension_reason IS NULL)
    OR (admin_suspended_at IS NOT NULL AND admin_suspended_by IS NOT NULL
        AND suspension_reason IS NOT NULL AND length(btrim(suspension_reason)) > 0)
  );
