# System context
Users access Next.js public, tenant, owner, and admin interfaces. Supabase Auth provides identity. The browser calls Next.js Route Handlers with the Supabase access token. The server verifies project JWT claims and signature, resolves the profile, applies server policies, and queries Supabase PostgreSQL. Storage integration manages images and private contract objects. A Next.js worker and scheduler run the same server services and dispatch durable notifications.

No service key, database password, or JWT signing material is sent to the browser. A public/anon key alone must not grant direct application-table access. A direct database login may bypass RLS depending on role. Restrict grants and RLS, and enforce server policies on every product action.
