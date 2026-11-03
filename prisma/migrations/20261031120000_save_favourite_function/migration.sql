CREATE OR REPLACE FUNCTION public.save_favourite(p_user_id uuid, p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM listings AS listing
    JOIN properties AS property ON property.id = listing.property_id
    WHERE listing.property_id = p_property_id
      AND listing.publication_status = 'PUBLISHED'
      AND listing.moderation_status = 'APPROVED'
      AND listing.archived_at IS NULL
      AND listing.admin_suspended_at IS NULL
      AND property.archived_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM units AS unit
        WHERE unit.property_id = property.id
          AND unit.archived_at IS NULL
      )
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO favourite_properties (user_id, property_id)
  VALUES (p_user_id, p_property_id)
  ON CONFLICT (user_id, property_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.save_favourite(uuid, uuid) FROM PUBLIC, anon, authenticated;
