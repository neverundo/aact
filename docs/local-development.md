# Local development

## Prerequisites

- Docker Engine + Compose v2
- **Free disk:** at least **~15 GB** available on the Docker data filesystem for a default `make setup` (no `mail` profile); **~30–40 GB** if you also enable localfakemail (`COMPOSE_PROFILES=mail`)
- Network access to Docker Hub (and to GitHub if building the `mail` profile)
- Optional: GNU Make, PHP 8.4+/8.5, Composer 2, Node 22 (for host-side tooling)

This host currently has PHP 8.5 and Node 22 available. Containers pin PHP 8.4 and Node 22.16.

### What `make setup` builds (default)

Default setup builds only **api** (shared by queue/scheduler), **web**, and **nginx**, then installs Composer/npm deps into bind mounts / named volumes. Mail goes to the Laravel `log` channel unless you opt into localfakemail.

That keeps first boot closer to “clone and run” instead of compiling two extra Node apps and pulling Postgres for mail.

### Why builds still take time / disk

Even the lean path pulls and compiles:

1. **API image** — `php:8.4-fpm-bookworm` + apt packages + PHP extensions + Redis pecl + Xdebug (queue/scheduler **reuse** `aact-api:local`; they do not rebuild).
2. **Web image** — thin Node base (no baked `node_modules`; `npm ci` fills `web_node_modules` during setup).
3. **Pulled services** — MariaDB, Redis.
4. **Optional `mail` profile** — Postgres + localfakemail SMTP/web (remote Git context + `npm install` inside those Dockerfiles) — the main historical source of 20–40+ minute / ENOSPC setups.

Confirm the resized disk is where Docker writes (`docker info | grep -i 'Docker Root Dir'`, then `df -h` / `df -i` on that path).

### Hung or crawling image pulls

If BuildKit sits for tens of minutes on lines like `php:8.4.27-fpm-bookworm` with progress stuck at a few MB (e.g. `4MB / 104MB`), that is almost always **Docker Hub / VM network / disk write**, not application code. It is not an acceptable “compile” cost — cancel and diagnose:

```bash
# Is the pull itself slow?
docker pull php:8.4.27-fpm-bookworm

df -h "$(docker info -f '{{.DockerRootDir}}')"
df -i "$(docker info -f '{{.DockerRootDir}}')"
docker builder prune -af
docker system prune -af
```

Retry after a healthy `docker pull`. On restricted networks, configure a registry mirror for Docker Hub.

If a previous run hit `ENOSPC`, prune before retrying — corrupted BuildKit/containerd state often looks like endless partial pulls.

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
- API health: http://localhost:18080/api/v1/health

Redis requires `REDIS_PASSWORD` (Compose `--requirepass`).

### Optional mail inbox (localfakemail)

```bash
# in .env
COMPOSE_PROFILES=mail
MAIL_MAILER=smtp
make setup
# UI: http://localhost:18025
```

Compose builds [localfakemail](https://github.com/neverundo/localfakemail) from the commit pinned in `compose.yaml` and seeds the SMTP credential from `.env`. Expect a longer first build and more disk when this profile is on.

If `8080`/`8025` are already bound on the host, keep the `18080`/`18025` defaults.

Demo seed + walkthrough: `make seed-demo` then [`docs/demo-walkthrough.md`](demo-walkthrough.md).

If `npm ci` fails with `EACCES` on `/app/node_modules`, remove the stale volume and re-run setup:

```bash
docker compose down
docker volume rm aact_web_node_modules
make setup
```

## Host-side checks (without Compose)

Useful while iterating on a single app:

```bash
cd apps/api && composer install && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse
cd apps/web && npm ci && npm run typecheck && npm run lint && npm run build
```

API feature tests use SQLite `:memory:` for smoke (ADR-0003). Financial invariants: `make test-financial`. E2E: `make test-e2e`.

## Optional profiles

```bash
# mail inbox — see above
docker compose --profile mail up -d

docker compose --profile antivirus up -d
docker compose --profile sonar up -d
```

Or set `COMPOSE_PROFILES=mail` (comma-separated) in `.env`.

## Migrations

Migrations are **not** auto-run by every container. Use:

```bash
make migrate
# or
docker compose exec api php artisan migrate
```
