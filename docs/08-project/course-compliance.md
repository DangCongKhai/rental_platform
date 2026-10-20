# Course compliance and evidence

Source: Advanced Web Final Project Brief CSB35050 VNUK(2).docx, assessment tasks and rubric. Total10marks; final project weighting50%; reference duration5weeks. Preserve actual grading conditions.

| ID | Marks | Printed criterion | Concrete deliverable/evidence | Modules | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T1a | .25 | GitHub repository | Repository URL/access; organized source/history | M10 | A | Required |
| T1b | .25 | Good commit messages | Atomic commits referring to actual issue; meaningful purpose | All | All | Required |
| T1c | .25 | GitHub Issues | Well-defined issue bodies with acceptance/dependency/owner links | M10 | A | Required |
| T1d | .25 | GitHub workflow | Topic branches, linked issues and PR review history; CI supports but does not replace these | M10 | A | Required |
| T2a | .5 | Database design/migrations | Reproducible SQL migrations in supabase/migrations, UUID schema, constraints/ERD incl favourites | M02/M06/M04 | A+B | Required |
| T2b | .5 | Seeders | Deterministic representative public/hidden/suspended, inventory, contracts, reports/favourites scenarios | All | B | Required |
| T3a | .25 | Tailwind UI | Next.js, React, and Tailwind screens with the project design system | M01/M10 | A | Required |
| T3b | .25 | Registration/login | Email confirmation/login/profile bootstrap and negative tests under approved provider | M01 | A | Required |
| T3c | .25 | CSRF and server validation | Actual transport threat model, framework protection where cookie credentials apply, field errors and hostile request tests | M01+All | A | Required |
| T3e | .25 | Query/filter/display | Seeded search full interval/same-unit filters, listing details and private favourites | M04 | C | Required |
| T3f | 1 | External API integration | Use Supabase Storage API integration: auth/config, completed upload/private download, error handling/logging, tests and demo; do not claim an SDK import alone | M02 | B | Required; confirm accepted evidence if lecturer requires another provider |
| T3g | 1 | UI/business unit+integration tests | Meaningful UI/business test suite and separately reported coverage strictly greater than70% | All | C+A | Required |
| T4a | .5 | Resource API CRUD | Next.js resource Route Handlers with validation schemas, response DTOs, HTTP status, validation, and ownership semantics | M02/M03/M04 | B | Required |
| T4b | .25 | Token security | Supabase JWT verification in Next.js server policies, including issuer, audience, expiry, and subject checks | M01 | A | Required |
| T4c | .25 | OpenAPI | OpenAPI generated from real Next.js Route Handlers, with bearer security and 409/422 examples | M10 | A | Required |
| T4d | 1 | API unit+integration tests | Next.js API, service, and policy integration coverage strictly greater than70%; real PostgreSQL race tests | All | A+B | Required |
| T5a | .25 | Development diagnostics | Restricted Next.js request, query, and job diagnostics | M10 | A | Required |
| T5b | .25 | Error handling/logging | Structured logs, friendly errors and actual critical error report/alert evidence | M10 | A | Required |
| T5c | .25 | Slow-query alert | Threshold rule and delivered deduplicated alert, not just query display | M10 | A | Required |
| T5d | .25 | Server monitoring | CPU/memory/disk/network collector and threshold alert evidence on chosen environment | M10 | A | Required |
| T6a | .5 | Asynchronous processing | Queue worker/outbox handling and scheduler jobs; failure/retry tests and duplicate safety | M09/M06/M05 | B+A | Required |
| T6b | .5 | Resource loading | Lazy loading/code split/images/bundles with measurable browser evidence | M04/M02 | C | Required |
| T6c | .5 | Caching | Document selected public caching/revalidation/invalidation and private isolation tests | M04/M03 | C+B | Required |
| T6d | .5 | Antipattern mitigation | N+1 avoidance, indexes, query profiling, and before/after evidence. No false optimization claims | M02/M04/M06 | B+A | Required |


## Submission requirements
- Root repository README must include run instructions, project overview/tools, feature list/screenshots, ERD and relevant lecturer notes. This docs directory does not replace root README.
- GitHub source, branches, issue-linked PRs and meaningful commit history.
- Each of four members submits a self-report for each of all five sprints. Brief says late/missing reports incur10% deduction from final group mark; do not replace individual evidence with a single group report.
- Screencast no longer than10minutes, at least720p MP4; YouTube public/unlisted or equivalent accessible link, not private. Demonstrate requirements in action; show logs/alerts/docs evidence where relevant, not only attractive pages.

## Evidence notes
Schema evidence is SQL in `supabase/migrations`. JSONB policies and amenities are bounded descriptive attributes with canonical schemas on a relational core. Explain this tradeoff in the database design evidence. Supabase Storage is the external API evidence: demonstrate auth, completed upload, private download, error handling, and logging.
