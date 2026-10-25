CREATE UNIQUE INDEX units_label_per_property
  ON units (property_id, lower(btrim(label)));

CREATE UNIQUE INDEX listings_one_current_per_property
  ON listings (property_id)
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX rental_requests_one_pending
  ON rental_requests (tenant_id, listing_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX renewals_one_pending
  ON tenancy_renewal_requests (tenancy_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX listing_reports_one_open
  ON listing_reports (reporter_id, listing_id)
  WHERE status IN ('OPEN', 'REVIEWING');
