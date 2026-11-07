CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET search_path TO public, extensions;

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_no_overlapping_holds
  EXCLUDE USING gist (
    unit_id WITH =,
    daterange(blocked_start_date, blocked_end_date + 1, '[)') WITH &&
  )
  WHERE (
    status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE')
    AND blocked_start_date IS NOT NULL
    AND blocked_end_date IS NOT NULL
  );
