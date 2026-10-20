# Deployment and operations

Local Supabase and Next.js run order is in [local development](../08-project/local-development.md). Discover the chosen provider first. Document the Next.js app, persistent PostgreSQL and storage, and the long-running worker and scheduler as separate responsibilities even if they are deployed together. Use environment templates, HTTPS, allowed origins/redirects, restricted diagnostics, signed private downloads, safe migrations/seeds, queue restart and health checks. Record runbook for worker/scheduler outage, failed jobs, migrations and visibility/cache invalidation. Do not claim deployment/free tiers or production readiness without evidence.

Validation is part of feature/engineering issues and PR evidence. Tool versions/configuration must match the local installed framework; no invented pass result.
