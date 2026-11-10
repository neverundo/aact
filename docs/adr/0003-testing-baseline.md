# ADR-0003: Testing baseline

## Status

Accepted

## Context

The product brief requires MariaDB for financial integrity tests and forbids relying only on SQLite for locks/constraints. Phase 0 has no financial domain yet.

## Decision

- Phase 0: keep Laravel’s default PHPUnit suite on SQLite `:memory:` for fast unit/feature smoke tests (health endpoint, example tests).
- From Phase 3 onward: MariaDB-backed suite lives in `phpunit.mariadb.xml` / `tests/Financial` (`make test-financial`, CI job `api-financial`).
- Frontend: `tsc --noEmit`, ESLint, and `next build` as gates; Playwright E2E lives in `/e2e` (Phase 5 / ADR-0008).

## Consequences

- CI validates toolchain health without pretending SQLite proves ledger invariants.
- MariaDB financial suite and Playwright demo flows are separate gates (`make test-financial`, `make test-e2e`).
