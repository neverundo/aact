# Testing

## Fast suite (default)

```bash
make test
# or
docker compose exec -T api php artisan test
```

Uses SQLite `:memory:` for auth/onboarding/ingestion smoke tests (ADR-0003).

## Financial / concurrency suite (MariaDB)

```bash
make test-financial
```

Creates `aact_test` on the Compose MariaDB service and runs `phpunit.mariadb.xml` (`tests/Financial`, group `mariadb`).

These tests assert unique constraints and ledger balance under repeated/racy ingest of the same `external_event_id`.

## Frontend

`npm run typecheck`, `npm run lint`, and `npm run build` in `apps/web`.

## E2E (Playwright)

Requires the Compose stack + `make seed-demo`.

```bash
make test-e2e
# or
cd e2e && npm ci && npx playwright install chromium && npm test
```

Covers: login a11y smoke, unauthenticated gates, admin MFA login, referrer portal (desktop + mobile projects). See ADR-0008.

## Coverage / Sonar

```bash
make coverage-api   # apps/api/coverage/clover.xml
make sonar-up
SONAR_TOKEN=… make sonar-scan
```

CI uploads the clover artifact; it does **not** claim a localhost Sonar quality gate on GitHub-hosted runners (`docs/sonar.md`).
