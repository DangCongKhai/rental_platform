# System context

Users reach the public, tenant, owner and admin areas of one Next.js app. Supabase Auth provides identity; `@supabase/ssr` keeps the session in cookies and `getClaims()` verifies it on the server. Server components and Server Actions resolve the profile, check access and query Supabase PostgreSQL through Prisma. Supabase Storage holds photos and private contract files.

There is no separate worker. If background work is ever needed, Supabase Cron or a Database Webhook calls a protected Route Handler in the same app.

No service key, database password or signing material is sent to the browser. The publishable key alone must not grant direct application-table access: revoke client grants on business tables and check access in server code for every action.
