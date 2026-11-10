# Architecture (Phase 0)

## Style

Modular monolith. One deployable Compose stack; one Laravel codebase; one Next.js frontend.

```text
Browser
  └─ Nginx (:8080)
       ├─ /api/*, /sanctum/*, /up  → Laravel php-fpm
       └─ /*                      → Next.js
```

## Runtime services

| Service | Role |
| --- | --- |
| `nginx` | Same-origin gateway, CSP + hardening headers (TLS profile in `infra/nginx/production.conf.example`) |
| `api` | Laravel PHP-FPM |
| `queue` | `queue:work` on Redis (same image as API) |
| `scheduler` | `schedule:run` loop (same image as API) |
| `web` | Next.js App Router |
| `mariadb` | Primary datastore |
| `redis` | Cache, sessions, queues |
| `mailpit` | Dev SMTP + UI |
| `clamav` | Optional antivirus profile |
| `sonarqube` + `sonar-db` | Optional analysis profile (PostgreSQL) |

## Trust boundaries

- Browser sessions: Sanctum cookies, CSRF, Laravel Policies (Phase 1+).
- Integrations: separate credentials, bearer + HMAC (Phase 3).
- Frontend route guards are UX only; authorization is always server-side.

## Money domain (Phase 3+)

Financial writes go through transactional application services into an append-only internal ledger (`ledger_entries` + `ledger_lines`). Commission accruals debit expense and credit referrer payable in minor units. Refunds/chargebacks post `commission_reversal` entries; external payout settlement posts `payout_settlement` (debit payable / credit clearing). History is never deleted. See ADR-0006, ADR-0007 and `docs/product-spec.md`.
