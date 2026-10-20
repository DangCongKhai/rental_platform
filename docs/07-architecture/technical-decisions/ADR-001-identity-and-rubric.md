# Supabase identity

Status: specified design, implementation unverified.

Decision: Next.js serves the UI and the API. Supabase provides identity, PostgreSQL, and Storage. Route Handlers verify the Supabase JWT and apply server policies. Application passwords stay in Supabase Auth.

Consequences: tests and issue acceptance must reference this behavior; record any approved change here and update affected PRDs/workflows/data/API/acceptance together.
