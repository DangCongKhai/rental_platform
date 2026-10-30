CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- unaccent() is STABLE, so an index cannot call it. This wrapper is the
-- indexed expression. Revoke browser roles; the migration owner still executes it.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, extensions
AS $$
  SELECT extensions.unaccent(input)
$$;

REVOKE ALL ON FUNCTION public.immutable_unaccent(text) FROM PUBLIC, anon, authenticated;

CREATE INDEX properties_address_line_trgm_idx
  ON properties USING gin (lower(public.immutable_unaccent(address_line)) extensions.gin_trgm_ops);

CREATE INDEX properties_ward_trgm_idx
  ON properties USING gin (lower(public.immutable_unaccent(ward)) extensions.gin_trgm_ops);

CREATE INDEX properties_city_trgm_idx
  ON properties USING gin (lower(public.immutable_unaccent(city)) extensions.gin_trgm_ops);
