-- Supabase owns the storage schema. Prisma shadow databases do not necessarily
-- include it, so keep this migration harmless when the schema is unavailable.
-- The contracts bucket is private. The app uploads and signs downloads with the
-- service role after a party check. Clients cannot read or write these objects.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $bucket$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'contracts',
        'contracts',
        false,
        10485760,
        ARRAY['application/pdf']::text[]
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $bucket$;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'DROP POLICY IF EXISTS contracts_objects_no_select ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS contracts_objects_no_insert ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS contracts_objects_no_update ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS contracts_objects_no_delete ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY contracts_objects_no_select
      ON storage.objects
      AS RESTRICTIVE
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id <> 'contracts')
    $policy$;
    EXECUTE $policy$
      CREATE POLICY contracts_objects_no_insert
      ON storage.objects
      AS RESTRICTIVE
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id <> 'contracts')
    $policy$;
    EXECUTE $policy$
      CREATE POLICY contracts_objects_no_update
      ON storage.objects
      AS RESTRICTIVE
      FOR UPDATE
      TO anon, authenticated
      USING (bucket_id <> 'contracts')
      WITH CHECK (bucket_id <> 'contracts')
    $policy$;
    EXECUTE $policy$
      CREATE POLICY contracts_objects_no_delete
      ON storage.objects
      AS RESTRICTIVE
      FOR DELETE
      TO anon, authenticated
      USING (bucket_id <> 'contracts')
    $policy$;
  END IF;
END
$$;
