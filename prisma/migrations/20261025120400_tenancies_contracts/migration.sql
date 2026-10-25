CREATE TABLE "tenancies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rental_request_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "actual_ended_at" TIMESTAMPTZ(6),
    "end_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" UUID NOT NULL,
    "confirmed_start_date" DATE,
    "confirmed_end_date" DATE,
    "blocked_start_date" DATE,
    "blocked_end_date" DATE,
    "pending_contract_id" UUID,
    "latest_confirmed_contract_id" UUID,
    "confirmation_expires_at" TIMESTAMPTZ(6),
    "moved_in_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenancies_rental_request_id_key" ON "tenancies"("rental_request_id");
CREATE INDEX "tenancies_unit_id_idx" ON "tenancies"("unit_id");
CREATE INDEX "tenancies_tenant_id_idx" ON "tenancies"("tenant_id");

ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id");
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "user_profiles"("id");
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user_profiles"("id");
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "rental_requests"("id");

ALTER TABLE tenancies ADD CONSTRAINT tenancies_status_check
  CHECK (status IN (
    'PENDING_CONFIRMATION', 'AWAITING_REVISION', 'CONFIRMED',
    'ACTIVE', 'EXPIRED', 'CANCELLED', 'ENDED'
  ));
ALTER TABLE tenancies ADD CONSTRAINT tenancies_blocked_order_check
  CHECK (blocked_start_date IS NULL OR blocked_end_date IS NULL OR blocked_end_date >= blocked_start_date);
ALTER TABLE tenancies ADD CONSTRAINT tenancies_confirmed_order_check
  CHECK (confirmed_start_date IS NULL OR confirmed_end_date IS NULL OR confirmed_end_date >= confirmed_start_date);

CREATE TABLE "tenancy_renewal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenancy_id" UUID NOT NULL,
    "requested_end_date" DATE NOT NULL,
    "proposed_monthly_rent" DECIMAL(14,0) NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenancy_renewal_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenancy_renewal_requests_tenancy_id_idx" ON "tenancy_renewal_requests"("tenancy_id");

ALTER TABLE "tenancy_renewal_requests" ADD CONSTRAINT "tenancy_renewal_requests_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id");
ALTER TABLE "tenancy_renewal_requests" ADD CONSTRAINT "tenancy_renewal_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user_profiles"("id");

ALTER TABLE tenancy_renewal_requests ADD CONSTRAINT renewals_status_check
  CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'));
ALTER TABLE tenancy_renewal_requests ADD CONSTRAINT renewals_rent_check
  CHECK (proposed_monthly_rent > 0);
ALTER TABLE tenancy_renewal_requests ADD CONSTRAINT renewals_rejection_reason_check
  CHECK (status <> 'REJECTED' OR (review_reason IS NOT NULL AND length(btrim(review_reason)) > 0));

CREATE TABLE "tenancy_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenancy_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "renewal_request_id" UUID,
    "supersedes_contract_id" UUID,
    "basis_contract_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(14,0) NOT NULL,
    "deposit_amount" DECIMAL(14,0) NOT NULL,
    "policies_snapshot" JSONB NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_sha256" TEXT NOT NULL,
    "signed_on" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "tenant_confirmed_at" TIMESTAMPTZ(6),
    "tenant_rejected_at" TIMESTAMPTZ(6),
    "tenant_rejection_reason" TEXT,

    CONSTRAINT "tenancy_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenancy_contracts_document_path_key" ON "tenancy_contracts"("document_path");
CREATE UNIQUE INDEX "tenancy_contracts_tenancy_id_version_number_key" ON "tenancy_contracts"("tenancy_id", "version_number");
CREATE INDEX "tenancy_contracts_tenancy_id_idx" ON "tenancy_contracts"("tenancy_id");

ALTER TABLE "tenancy_contracts" ADD CONSTRAINT "tenancy_contracts_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id");
ALTER TABLE "tenancy_contracts" ADD CONSTRAINT "tenancy_contracts_renewal_request_id_fkey" FOREIGN KEY ("renewal_request_id") REFERENCES "tenancy_renewal_requests"("id");
ALTER TABLE "tenancy_contracts" ADD CONSTRAINT "tenancy_contracts_supersedes_contract_id_fkey" FOREIGN KEY ("supersedes_contract_id") REFERENCES "tenancy_contracts"("id");
ALTER TABLE "tenancy_contracts" ADD CONSTRAINT "tenancy_contracts_basis_contract_id_fkey" FOREIGN KEY ("basis_contract_id") REFERENCES "tenancy_contracts"("id");
ALTER TABLE "tenancy_contracts" ADD CONSTRAINT "tenancy_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_profiles"("id");

ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_pending_contract_id_fkey" FOREIGN KEY ("pending_contract_id") REFERENCES "tenancy_contracts"("id");
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_latest_confirmed_contract_id_fkey" FOREIGN KEY ("latest_confirmed_contract_id") REFERENCES "tenancy_contracts"("id");

ALTER TABLE tenancy_contracts ADD CONSTRAINT tenancy_contracts_type_check
  CHECK (type IN ('ORIGINAL', 'RENEWAL'));
ALTER TABLE tenancy_contracts ADD CONSTRAINT tenancy_contracts_dates_check
  CHECK (end_date >= start_date);
ALTER TABLE tenancy_contracts ADD CONSTRAINT tenancy_contracts_rent_check
  CHECK (monthly_rent > 0 AND deposit_amount >= 0);
ALTER TABLE tenancy_contracts ADD CONSTRAINT tenancy_contracts_decision_check
  CHECK (NOT (tenant_confirmed_at IS NOT NULL AND tenant_rejected_at IS NOT NULL));
ALTER TABLE tenancy_contracts ADD CONSTRAINT tenancy_contracts_rejection_reason_check
  CHECK (
    (tenant_rejected_at IS NULL AND tenant_rejection_reason IS NULL)
    OR (tenant_rejected_at IS NOT NULL AND tenant_rejection_reason IS NOT NULL
        AND length(btrim(tenant_rejection_reason)) > 0)
  );
