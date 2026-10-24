# Deployment and operations

Local Supabase and Next.js run order is in [local development](../08-project/local-development.md). The app is one Next.js deployment plus a Supabase project (PostgreSQL, Auth, Storage); there is no separate worker or scheduler. Use environment templates, HTTPS, allowed auth redirects, signed private downloads, and safe migrations and seeds. If a Supabase Cron job or Database Webhook is added, store its secret in Supabase Vault and the app's server environment. Do not claim production readiness without evidence.
