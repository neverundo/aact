# Local development

## Prerequisites

- Docker Engine + Compose v2 (network access on first build to pull [localfakemail](https://github.com/neverundo/localfakemail) at the commit pinned in `compose.yaml`)
- **Free disk:** at least **~20 GB** available on the filesystem that holds Docker data (often `/var/lib/docker`); **~30–40 GB** is more comfortable for a clean first `make setup`
- Optional: GNU Make, PHP 8.4+/8.5, Composer 2, Node 22 (for host-side tooling)

This host currently has PHP 8.5 and Node 22 available. Containers pin PHP 8.4 and Node 22.16.

### Why setup needs so much disk

`make setup` is a full local stack build, not a single app install. Peak usage is driven by:

1. **Several images at once** — AACT `api`/`queue`/`scheduler` (PHP 8.4 + extensions + Xdebug), `web` (Next.js + `node_modules`), `nginx`, plus [localfakemail](https://github.com/neverundo/localfakemail) SMTP + web (another Node/Next build).
2. **Pulled bases** — `mariadb`, `redis`, `postgres`, `node`, `php`, `composer`, and BuildKit intermediate layers from multi-stage Dockerfiles.
3. **Build peak ≫ final size** — `npm ci` / `composer install` download and extract under `/var/lib/docker` while layers are still being assembled; parallel Compose builds multiply temporary usage. Running out of space mid-extract often shows up as `ENOSPC` and cascading `TAR_ENTRY_ERROR` / `ResourceExhausted`.
4. **Dev bind mounts** — after the image build, setup also runs `composer install` / `npm ci` into the mounted app trees (and the anonymous `node_modules` volume for `web`).

Small cloud VMs (≈10–20 GB total disk) commonly fail here even though the running stack is smaller once build cache is pruned.

Check before setup:

```bash
df -h
df -i          # inode exhaustion looks like "space left" but mkdir/npm still fail
docker system df
```

If a build fails with `no space left on device` / `ENOSPC`, or later with odd `npm`/`ENOENT` errors on `node_modules`, treat the BuildKit cache as suspect (a previous full-disk extract often leaves broken layers). Free leftovers and retry **without** relying on that cache:

```bash
docker builder prune -af
docker system prune -af
# Only if you accept deleting unused volumes as well:
# docker system prune -af --volumes
df -h && df -i
docker compose build --no-cache
```

Then ensure the VM disk (or Docker data root) has enough free space/inodes and re-run `make setup`.

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
