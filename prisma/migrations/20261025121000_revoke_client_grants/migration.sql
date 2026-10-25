REVOKE ALL ON TABLE
  public.user_profiles,
  public.properties,
  public.units,
  public.property_media,
  public.listings,
  public.rental_requests,
  public.tenancies,
  public.tenancy_renewal_requests,
  public.tenancy_contracts,
  public.listing_reports,
  public.favourite_properties,
  public.notifications
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.listings_cover_is_live_shared(),
  public.rental_requests_preferred_unit_same_property(),
  public.tenancy_contracts_guard(),
  public.tenancy_contracts_no_delete(),
  public.assert_commit_invariants()
FROM PUBLIC, anon, authenticated;
