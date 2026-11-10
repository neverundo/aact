# AACT — CommissionHub (provisional name)

Self-hosted, API-first commission attribution and settlement platform.

The platform records commercial events from any source system, calculates commissions with versioned rules, keeps an auditable internal ledger, and supports manual external payout confirmation. It does **not** move money or integrate with a specific PSP/storefront.

Canonical product brief: [`docs/product-spec.md`](docs/product-spec.md).

## Why this exists (portfolio)

Demonstrates a modular monolith with real financial invariants: Sanctum MFA, business isolation, HMAC integration ingestion, versioned commission rules (bps), append-only balanced ledger, proportional refund clawbacks, and payout settlement — runnable via Docker Compose.

## Stack

| Layer | Version |
| --- | --- |
| Laravel | 13.40 (skeleton 13.11) |
| PHP (containers) | 8.4.14 |
| Sanctum | 4.3 |
| Next.js | 16.4 |
| React | 19.3 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| MariaDB | 11.4.5 |
| Redis | 7.4.2 |
| Nginx | 1.27.5 |
| Node (containers) | 22.16.0 |
| Mailpit | v1.24.1 |
| ClamAV (optional profile) | 1.4.2 |
| SonarQube (optional profile) | 25.5.0 + PostgreSQL 16.8 |
| Playwright (E2E) | 1.56 |

## Repository layout

```text
apps/api          Laravel API
apps/web          Next.js (/admin, /portal)
e2e/              Playwright (gateway flows)
examples/         node-checkout + offline-sale
infra/docker      Dockerfiles (multi-stage)
infra/nginx       Reverse proxy (+ production TLS example)
infra/sonar       Sonar project config
docs/             Spec, ADRs, OpenAPI, runbooks
compose.yaml      Local stack
```

## Quick start

```bash
cp .env.example .env
make setup
make seed-demo
```

- App: [http://localhost:18080](http://localhost:18080)
- Mailpit: [http://localhost:18025](http://localhost:18025)

Health: `GET /api/v1/health` · `GET /up` · `GET /healthz`

Walkthrough: [`docs/demo-walkthrough.md`](docs/demo-walkthrough.md).

## Common commands

```bash
make up
make down
make migrate
make seed-demo
make test
make test-financial
make test-e2e
make lint
make coverage-api
make sonar-up
make sonar-scan   # needs SONAR_TOKEN + local Sonar
```

### Demo users (local only)

| Email | Password | Notes |
| --- | --- | --- |
| `platform@aact.test` | `platform-passphrase` | TOTP `JBSWY3DPEHPK3PXP` |
| `admin@aact.test` | `admin-passphrase` | TOTP `JBSWY3DPEHPK3PXP` |
| `referrer@aact.test` | `referrer-passphrase` | portal referrer |

## Implementation phases

| Phase | Status |
| --- | --- |
| 0 Foundation | Done |
| 1 Identity / MFA / isolation | Done |
| 2 Invitations / onboarding | Done |
| 3 Ingestion / rules / ledger | Done |
| 4 Refunds / settlement | Done |
| 5 Quality / presentation | Done |

## Documentation

- [`docs/product-spec.md`](docs/product-spec.md)
- [`docs/demo-walkthrough.md`](docs/demo-walkthrough.md)
- [`docs/openapi.yaml`](docs/openapi.yaml)
- [`docs/hardening.md`](docs/hardening.md)
- [`docs/operations.md`](docs/operations.md)
- [`docs/local-development.md`](docs/local-development.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/testing.md`](docs/testing.md)
- [`docs/sonar.md`](docs/sonar.md)
- [`docs/adr/`](docs/adr/)
