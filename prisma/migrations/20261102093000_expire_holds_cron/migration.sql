-- Fallback for confirmation holds nobody opens. The Next.js route still does the
-- work: this job only POSTs to it. Enable pg_cron, pg_net, and supabase_vault
-- before applying this migration. Shadow databases do not have those
-- extensions, and a failed CREATE EXTENSION is ignored so migrate can finish.
--
-- The job sends nothing until Vault has both secrets:
--   app_url      deployed origin, no path (https://rent.example)
--   cron_secret  the same value as the server variable CRON_SECRET
DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$ext$;

DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$ext$;

DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS supabase_vault;
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$ext$;

DO $migration$
DECLARE
  existing bigint;
BEGIN
  IF to_regclass('cron.job') IS NULL
     OR to_regclass('vault.decrypted_secrets') IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_proc AS p
       JOIN pg_namespace AS n ON n.oid = p.pronamespace
       WHERE n.nspname = 'net' AND p.proname = 'http_post'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_proc AS p
       JOIN pg_namespace AS n ON n.oid = p.pronamespace
       WHERE n.nspname = 'cron' AND p.proname = 'schedule'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'cron'
         AND table_name = 'job'
         AND column_name = 'jobname'
     )
  THEN
    RETURN;
  END IF;

  FOR existing IN
    SELECT jobid FROM cron.job WHERE jobname = 'expire-holds'
  LOOP
    PERFORM cron.unschedule(existing);
  END LOOP;

  PERFORM cron.schedule(
    'expire-holds',
    '15 * * * *',
    $job$
    select net.http_post(
      url := rtrim(app.decrypted_secret, '/') || '/api/cron/expire-holds',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret.decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    )
    from vault.decrypted_secrets as app
    join vault.decrypted_secrets as secret
      on secret.name = 'cron_secret'
    where app.name = 'app_url'
      and btrim(app.decrypted_secret) <> ''
      and btrim(secret.decrypted_secret) <> '';
    $job$
  );
END
$migration$;
