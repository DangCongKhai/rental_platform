CREATE OR REPLACE FUNCTION public.tenancy_contracts_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT tenancies.owner_id
    INTO owner_id
  FROM tenancies
  WHERE tenancies.id = NEW.tenancy_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by <> owner_id THEN
      RAISE EXCEPTION 'contract created_by must be the tenancy owner'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.tenant_confirmed_at IS NOT NULL
       OR NEW.tenant_rejected_at IS NOT NULL
       OR NEW.tenant_rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'tenant decision is written after insert'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenancy_id IS DISTINCT FROM OLD.tenancy_id
     OR NEW.version_number IS DISTINCT FROM OLD.version_number
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.renewal_request_id IS DISTINCT FROM OLD.renewal_request_id
     OR NEW.supersedes_contract_id IS DISTINCT FROM OLD.supersedes_contract_id
     OR NEW.basis_contract_id IS DISTINCT FROM OLD.basis_contract_id
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.monthly_rent IS DISTINCT FROM OLD.monthly_rent
     OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
     OR NEW.policies_snapshot IS DISTINCT FROM OLD.policies_snapshot
     OR NEW.document_path IS DISTINCT FROM OLD.document_path
     OR NEW.document_sha256 IS DISTINCT FROM OLD.document_sha256
     OR NEW.signed_on IS DISTINCT FROM OLD.signed_on
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.owner_confirmed_at IS DISTINCT FROM OLD.owner_confirmed_at THEN
    RAISE EXCEPTION 'submitted contract terms and owner acknowledgement are immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.tenant_confirmed_at IS NOT NULL OR OLD.tenant_rejected_at IS NOT NULL THEN
    IF NEW.tenant_confirmed_at IS DISTINCT FROM OLD.tenant_confirmed_at
       OR NEW.tenant_rejected_at IS DISTINCT FROM OLD.tenant_rejected_at
       OR NEW.tenant_rejection_reason IS DISTINCT FROM OLD.tenant_rejection_reason THEN
      RAISE EXCEPTION 'tenant decision is write-once'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_confirmed_at IS NOT NULL AND NEW.tenant_rejected_at IS NOT NULL THEN
    RAISE EXCEPTION 'tenant cannot both confirm and reject'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenancy_contracts_immutable ON tenancy_contracts;
CREATE TRIGGER tenancy_contracts_immutable
  BEFORE INSERT OR UPDATE ON tenancy_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tenancy_contracts_guard();

CREATE OR REPLACE FUNCTION public.tenancy_contracts_no_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'contract versions cannot be deleted' USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS tenancy_contracts_no_delete ON tenancy_contracts;
CREATE TRIGGER tenancy_contracts_no_delete
  BEFORE DELETE ON tenancy_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tenancy_contracts_no_delete();

CREATE OR REPLACE FUNCTION public.assert_commit_invariants()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  req public.rental_requests%ROWTYPE;
  ten public.tenancies%ROWTYPE;
  contract public.tenancy_contracts%ROWTYPE;
  earliest date;
  property_owner uuid;
BEGIN
  IF TG_TABLE_NAME = 'rental_requests' THEN
    SELECT * INTO req FROM rental_requests WHERE id = NEW.id;
    SELECT * INTO ten FROM tenancies WHERE rental_request_id = NEW.id;
  ELSE
    SELECT * INTO ten FROM tenancies WHERE id = NEW.id;
    SELECT * INTO req FROM rental_requests WHERE id = ten.rental_request_id;
  END IF;

  IF req.status = 'ACCEPTED' AND ten.id IS NULL THEN
    RAISE EXCEPTION 'ACCEPTED rental request has no tenancy' USING ERRCODE = '23514';
  END IF;
  IF req.status <> 'ACCEPTED' AND ten.id IS NOT NULL THEN
    RAISE EXCEPTION 'tenancy exists for a request that is not ACCEPTED' USING ERRCODE = '23514';
  END IF;
  IF ten.id IS NULL THEN
    RETURN NULL;
  END IF;
  IF ten.tenant_id <> req.tenant_id THEN
    RAISE EXCEPTION 'tenancy tenant must match the enquiry' USING ERRCODE = '23514';
  END IF;

  SELECT properties.owner_id INTO property_owner
  FROM units
  JOIN properties ON properties.id = units.property_id
  WHERE units.id = ten.unit_id;
  IF ten.owner_id <> property_owner THEN
    RAISE EXCEPTION 'tenancy owner must be the property owner' USING ERRCODE = '23514';
  END IF;

  IF ten.status IN ('CONFIRMED', 'ACTIVE') THEN
    IF ten.confirmed_start_date IS NULL OR ten.confirmed_end_date IS NULL
       OR ten.blocked_start_date IS NULL OR ten.blocked_end_date IS NULL
       OR ten.latest_confirmed_contract_id IS NULL
       OR ten.blocked_start_date <> ten.confirmed_start_date
       OR ten.blocked_end_date < ten.confirmed_end_date THEN
      RAISE EXCEPTION 'confirmed tenancy span is incomplete' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO contract FROM tenancy_contracts WHERE id = ten.latest_confirmed_contract_id;
    IF contract.owner_confirmed_at IS NULL OR contract.tenant_confirmed_at IS NULL
       OR contract.tenant_rejected_at IS NOT NULL
       OR contract.end_date <> ten.confirmed_end_date THEN
      RAISE EXCEPTION 'latest contract does not match the confirmed span' USING ERRCODE = '23514';
    END IF;
    SELECT min(start_date) INTO earliest
    FROM tenancy_contracts
    WHERE tenancy_id = ten.id
      AND tenant_confirmed_at IS NOT NULL
      AND tenant_rejected_at IS NULL;
    IF earliest IS DISTINCT FROM ten.confirmed_start_date THEN
      RAISE EXCEPTION 'confirmed start does not match the earliest mutual version'
        USING ERRCODE = '23514';
    END IF;
  ELSIF ten.status = 'PENDING_CONFIRMATION' THEN
    IF ten.pending_contract_id IS NULL
       OR ten.blocked_start_date IS NULL
       OR ten.blocked_end_date IS NULL
       OR ten.confirmation_expires_at IS NULL
       OR ten.confirmed_start_date IS NOT NULL
       OR ten.confirmed_end_date IS NOT NULL
       OR ten.latest_confirmed_contract_id IS NOT NULL THEN
      RAISE EXCEPTION 'pending confirmation must hold dates and no confirmed span'
        USING ERRCODE = '23514';
    END IF;
    SELECT * INTO contract FROM tenancy_contracts WHERE id = ten.pending_contract_id;
    IF contract.tenant_confirmed_at IS NOT NULL OR contract.tenant_rejected_at IS NOT NULL THEN
      RAISE EXCEPTION 'pending contract must still be awaiting the tenant'
        USING ERRCODE = '23514';
    END IF;
  ELSIF ten.status IN ('AWAITING_REVISION', 'EXPIRED', 'CANCELLED', 'ENDED') THEN
    IF ten.pending_contract_id IS NOT NULL
       OR ten.blocked_start_date IS NOT NULL
       OR ten.blocked_end_date IS NOT NULL
       OR ten.confirmation_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'this tenancy status must not keep a hold' USING ERRCODE = '23514';
    END IF;
    IF ten.status IN ('CANCELLED', 'ENDED')
       AND (ten.actual_ended_at IS NULL OR ten.end_reason IS NULL OR length(btrim(ten.end_reason)) = 0) THEN
      RAISE EXCEPTION 'cancelled or ended tenancy requires an end reason' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS rental_requests_commit_invariants ON rental_requests;
CREATE CONSTRAINT TRIGGER rental_requests_commit_invariants
  AFTER INSERT OR UPDATE ON rental_requests
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_commit_invariants();

DROP TRIGGER IF EXISTS tenancies_commit_invariants ON tenancies;
CREATE CONSTRAINT TRIGGER tenancies_commit_invariants
  AFTER INSERT OR UPDATE ON tenancies
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_commit_invariants();
