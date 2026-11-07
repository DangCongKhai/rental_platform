# GitHub issue authoring

## Before planning

Read `AGENTS.md`, the root README, `package.json` and the current branches and tests. Check existing GitHub issues and PRs. Classify each requirement as implemented, partial, missing, deferred or removed, and link the code or test that proves it. Never invent completion.

## Scope

Group issues by actor flow from the prototype: public & auth, tenant, manage (owner) and admin. A flow that crosses the tenant and owner workspaces (contract, deadline expiry, withdraw/reject, renewal) is its own issue so one member owns it end to end. Each issue is a concrete feature or flow that may cover several FRs; never one issue per table or per acceptance case. Shared setup and the database schema are the only cross-flow issues.

Estimates are tentative (about 1–4.5 days per issue) and revised once work starts.

## Issue body

```markdown
## Outcome

Concrete user trigger and resulting behavior.

## References

FR and AC IDs, prototype flows and screens, module and workflow doc links.

## Current repository evidence

What exists, partly exists or is missing, with file paths.

## Scope and non-goals

Exact UI, actions and data changes; explicit exclusions.

## Implementation checklist

- [ ] Steps tied to the repository's actual structure

## API and data contract

Server Actions and server reads (see docs/07-architecture/api-design.md), schema fields and constraints.

## Acceptance criteria

- [ ] Observable happy path
- [ ] Validation, access checks, empty/loading/failure states
- [ ] Relevant race, stale-state or deadline cases

## Tests and evidence

Unit and integration tests, including real PostgreSQL tests for constraints. Do not claim results that were not run.

## Dependencies

Task keys first, then GitHub issue numbers after publishing. No cycles.

## Ownership and review

Owner, reviewer, risk and tentative estimate.

## Definition of done

Behavior integrated, tests passing, docs updated, linked PR approved by the other member.
```

## Labels and milestones

Use `flow:*`, `module:*`, `priority:*`, `risk:*` and `area:*` labels and one milestone per flow. Assign only verified GitHub handles.

## Publishing

Draft `planning/issue-plan.md`, `planning/issues-manifest.json` and one Markdown body per task first. Each body starts with a `<!-- rentos-task: RENT-xxx -->` marker so republishing never creates duplicates. Create issues with `gh issue create --body-file` in dependency order, store the returned numbers in the manifest, then replace task keys with issue numbers. Never delete, close or rewrite existing issues just to fit the plan.
