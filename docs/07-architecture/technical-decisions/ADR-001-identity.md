# Supabase identity and Server Actions

Status: accepted for this project, implementation in progress.

Decision: Next.js serves the UI and all server logic. Supabase provides identity, PostgreSQL and Storage. `@supabase/ssr` keeps the session in cookies; server code verifies it with `getClaims()` and checks access before every read of private data and every Server Action. Application passwords stay in Supabase Auth. There is no custom JWT/JWKS verification and no public REST API.

Consequences: Server Actions' same-origin check covers CSRF for writes. Any Route Handler (only optional cron/webhook endpoints) must check a secret header. Record any change here and update the affected PRDs, workflows and the action contract together.
