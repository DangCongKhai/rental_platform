CREATE TABLE "rental_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "preferred_unit_id" UUID,
    "desired_move_in_date" DATE NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "outcome_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "desired_end_date" DATE NOT NULL,
    "availability_checked_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rental_requests_listing_id_idx" ON "rental_requests"("listing_id");
CREATE INDEX "rental_requests_tenant_id_idx" ON "rental_requests"("tenant_id");

ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id");
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "user_profiles"("id");
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_preferred_unit_id_fkey" FOREIGN KEY ("preferred_unit_id") REFERENCES "units"("id");

ALTER TABLE rental_requests ADD CONSTRAINT rental_requests_status_check
  CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'));
ALTER TABLE rental_requests ADD CONSTRAINT rental_requests_dates_check
  CHECK (desired_end_date >= desired_move_in_date);
ALTER TABLE rental_requests ADD CONSTRAINT rental_requests_closed_reason_check
  CHECK (status NOT IN ('REJECTED', 'WITHDRAWN') OR (outcome_reason IS NOT NULL AND length(btrim(outcome_reason)) > 0));
