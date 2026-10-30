-- Supabase owns the storage schema. Prisma shadow databases do not necessarily
-- include it, so keep this migration harmless when the schema is unavailable.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $bucket$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'property-media',
        'property-media',
        false,
        10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $bucket$;
  END IF;
END
$$;
