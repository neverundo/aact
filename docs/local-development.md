# Local development

## Prerequisites

- Docker Engine + Compose v2 (network access on first build to pull [localfakemail](https://github.com/neverundo/localfakemail) at the commit pinned in `compose.yaml`)
- Optional: GNU Make, PHP 8.4+/8.5, Composer 2, Node 22 (for host-side tooling)

This host currently has PHP 8.5 and Node 22 available. Containers pin PHP 8.4 and Node 22.16.

## First boot

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
make setup
```

Open (defaults; overridable via `.env`):

- App: http://localhost:18080
- Admin: http://localhost:18080/admin
- Portal: http://localhost:18080/portal
- localfakemail: http://localhost:18025
- API health: http://localhost:18080/api/v1/health

Compose builds [localfakemail](https://github.com/neverundo/localfakemail) from the commit pinned in `compose.yaml`, seeds a local SMTP credential from `.env` / `.env.example`, and injects it into the API containers. Generate additional key/secret pairs in the localfakemail Settings UI if needed. Redis requires `REDIS_PASSWORD` (Compose `--requirepass`).

If `8080`/`8025` are already bound on the host, keep the `18080`/`18025` defaults.

Demo seed + walkthrough: `make seed-demo` then [`docs/demo-walkthrough.md`](demo-walkthrough.md).

## Host-side checks (without Compose)

Useful while iterating on a single app:

```bash
cd apps/api && composer install && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse
cd apps/web && npm ci && npm run typecheck && npm run lint && npm run build
```

API feature tests use SQLite `:memory:` for smoke (ADR-0003). Financial invariants: `make test-financial`. E2E: `make test-e2e`.

## Optional profiles

```bash
docker compose --profile antivirus up -d
docker compose --profile sonar up -d
```

## Migrations

Migrations are **not** auto-run by every container. Use:

```bash
make migrate
# or
docker compose exec api php artisan migrate
```
