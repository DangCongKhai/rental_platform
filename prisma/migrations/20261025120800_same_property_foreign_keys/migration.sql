ALTER TABLE units
  ADD CONSTRAINT units_property_id_id_key UNIQUE (property_id, id);
ALTER TABLE property_media
  ADD CONSTRAINT property_media_property_id_id_key UNIQUE (property_id, id);
ALTER TABLE tenancy_contracts
  ADD CONSTRAINT tenancy_contracts_tenancy_id_id_key UNIQUE (tenancy_id, id);

ALTER TABLE property_media
  ADD CONSTRAINT property_media_unit_same_property
  FOREIGN KEY (property_id, unit_id)
  REFERENCES units (property_id, id);

ALTER TABLE listings
  ADD CONSTRAINT listings_cover_same_property
  FOREIGN KEY (property_id, cover_media_id)
  REFERENCES property_media (property_id, id);

ALTER TABLE tenancy_contracts
  ADD CONSTRAINT tenancy_contracts_supersedes_same_tenancy
  FOREIGN KEY (tenancy_id, supersedes_contract_id)
  REFERENCES tenancy_contracts (tenancy_id, id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tenancy_contracts
  ADD CONSTRAINT tenancy_contracts_basis_same_tenancy
  FOREIGN KEY (tenancy_id, basis_contract_id)
  REFERENCES tenancy_contracts (tenancy_id, id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_pending_same_tenancy
  FOREIGN KEY (id, pending_contract_id)
  REFERENCES tenancy_contracts (tenancy_id, id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_latest_same_tenancy
  FOREIGN KEY (id, latest_confirmed_contract_id)
  REFERENCES tenancy_contracts (tenancy_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.listings_cover_is_live_shared()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cover_media_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM property_media AS media
    WHERE media.id = NEW.cover_media_id
      AND media.property_id = NEW.property_id
      AND media.unit_id IS NULL
      AND media.deleted_at IS NULL
      AND media.purged_at IS NULL
  ) THEN
    RAISE EXCEPTION 'cover media must be a live shared photo of this property'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_cover_is_live_shared ON listings;
CREATE TRIGGER listings_cover_is_live_shared
  BEFORE INSERT OR UPDATE OF cover_media_id, property_id ON listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_cover_is_live_shared();

CREATE OR REPLACE FUNCTION public.rental_requests_preferred_unit_same_property()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.preferred_unit_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM listings
    JOIN units ON units.id = NEW.preferred_unit_id
    WHERE listings.id = NEW.listing_id
      AND units.property_id = listings.property_id
  ) THEN
    RAISE EXCEPTION 'preferred unit is not in the listing property'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rental_requests_preferred_unit_same_property ON rental_requests;
CREATE TRIGGER rental_requests_preferred_unit_same_property
  BEFORE INSERT OR UPDATE OF preferred_unit_id, listing_id ON rental_requests
  FOR EACH ROW EXECUTE FUNCTION public.rental_requests_preferred_unit_same_property();
