# Test strategy and scenarios

## Levels

- Unit tests for interface behavior and for pure date, policy, and catalog logic.
- Integration tests when a behavior depends on the API, authorization, validation, or the database. Use the real Postgres database for a constraint that unit tests cannot show, such as a unique pair or an exclusion constraint.
- Storage calls can use a deterministic fake in integration tests. One controlled run against the provider is enough when a feature needs that evidence, and that run must not print secrets.

## Evidence

Record the command and the result with the change. Until a test has been run, leave it as not executed. Logs and screenshots stay free of credentials and private contract contents.
