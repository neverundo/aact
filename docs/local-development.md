# Local development

## Prerequisites

- Docker Engine + Compose v2
- **Free disk on Docker’s data filesystem** (often `/var/lib/docker` on `/`): plan for **~8–15 GB free** for a default `make setup`; more if you enable `COMPOSE_PROFILES=mail`
- Network access to Docker Hub (HTTPS to `registry-1.docker.io` / CloudFront) — and to GitHub if using the `mail` profile
- Optional: GNU Make, PHP 8.4+/8.5, Composer 2, Node 22 (for host-side tooling)

This host currently has PHP 8.5 and Node 22 available. Containers pin PHP 8.4 and Node 22.16.

### Split disks (common cloud VM trap)

Many VMs put a small root (`/`, ~8–10 GB) and a large `/home`. Expanding the VM disk into `/home` does **not** help Docker if `Docker Root Dir` is still under `/`:

```text
/dev/vda1   9.1G   …  2.6G free   /          ← Docker images/layers live here
/dev/vda6    42G   …   39G free   /home      ← git clone is here; npm/composer bind-mounts help, pulls do not
```

Check:

```bash
docker info -f '{{.DockerRootDir}}'
df -h "$(docker info -f '{{.DockerRootDir}}')" .
```

**Fix (recommended):** move Docker’s data root onto the large disk (Debian/Ubuntu outline):

```bash
sudo systemctl stop docker
sudo mkdir -p /home/docker-data
# optional: rsync -aP /var/lib/docker/ /home/docker-data/
# Then set data-root in /etc/docker/daemon.json, e.g. { "data-root": "/home/docker-data" }
sudo systemctl start docker
docker info -f '{{.DockerRootDir}}'   # must show /home/docker-data
```

Alternatively grow/repartition `/` so the Docker filesystem itself has tens of GB free.

### What `make setup` builds (default)

Default setup builds only **api** (shared by queue/scheduler), **web**, and **nginx**, then installs Composer/npm deps into bind mounts / named volumes. Mail goes to the Laravel `log` channel unless you opt into localfakemail.

That keeps first boot closer to “clone and run” instead of compiling two extra Node apps and pulling Postgres for mail.

### Why builds still take time / disk

Even the lean path pulls and compiles:

1. **API image** — `php:8.4-fpm-bookworm` + apt packages + PHP extensions + Redis pecl + Xdebug (queue/scheduler **reuse** `aact-api:local`; they do not rebuild).
2. **Web image** — thin Node base; `npm ci` writes `apps/web/node_modules` on the **host project disk** (bind mount), not a Docker named volume.
3. **Pulled services** — MariaDB, Redis (these still live under Docker’s data root).
4. **Optional `mail` profile** — Postgres + localfakemail SMTP/web — the main historical source of 20–40+ minute / ENOSPC setups.

`make setup` prints `df` for the Docker root and the project directory and aborts if Docker has under ~8 GiB free.

### Hung pulls / `DeadlineExceeded` / `i/o timeout`

Failures like `failed to resolve source metadata for docker.io/library/nginx:…` or `dial tcp …:443: i/o timeout` / `DeadlineExceeded` mean the VM **cannot reliably reach Docker Hub’s CDN**. That is infrastructure (egress firewall, slow/blocked 443, flaky DNS), not an AACT bug.

```bash
# Reproduce outside Compose:
docker pull nginx:1.27.5-alpine
docker pull php:8.4.27-fpm-bookworm

curl -I --max-time 20 https://registry-1.docker.io/v2/
```

If pulls hang or time out, fix network/DNS/proxy or configure a registry mirror; retrying `make setup` alone will keep failing. Slow links plus a tiny Docker disk also produce multi‑tens‑of‑minutes “stuck” layer downloads.

If a previous run hit `ENOSPC`, prune before retrying — corrupted BuildKit/containerd state often looks like endless partial pulls:

```bash
docker builder prune -af
docker system prune -af
```

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

If `npm ci` fails with `ENOSPC`, free Docker leftovers (images still need room for layers) and clear a partial install:

```bash
docker builder prune -af
docker system prune -af
rm -rf apps/web/node_modules apps/web/.npm-cache
docker volume rm aact_web_node_modules 2>/dev/null || true
df -h "$(docker info -f '{{.DockerRootDir}}')" .
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
