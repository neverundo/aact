# Operations notes

## Backups (MariaDB)

Compose volume: `mariadb_data`.

Logical dump (local):

```bash
docker compose exec -T mariadb mariadb-dump -uroot -p"$DB_ROOT_PASSWORD" --single-transaction --routines aact > backup-aact.sql
```

Restore into a fresh database (destructive — review first):

```bash
docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS aact; CREATE DATABASE aact; GRANT ALL ON aact.* TO 'aact'@'%';"
docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" aact < backup-aact.sql
```

### Private documents

- **Local driver** (`PRIVATE_DOCUMENTS_DRIVER=local`): binaries under `storage/app/private/documents` on the API filesystem. Back them up with the DB dump; a DB-only restore without files breaks download.
- **S3 driver** (`PRIVATE_DOCUMENTS_DRIVER=s3`): objects under prefix `PRIVATE_DOCUMENTS_PREFIX` (default `referrers-docs/`) in `AWS_BUCKET`. Configure bucket/endpoint/credentials via deploy secrets or local `.env.staging` (never commit real values). Backup/version the bucket separately from MariaDB.
- Blobs are **application-encrypted** with `AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY` (payload prefix `aactdoc1:`). Losing that key makes ciphertext unrecoverable even if objects/DB are restored — back it up with the same rigor as `APP_KEY`.

## Production hardening checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, strong `APP_KEY`
- [ ] `SESSION_SECURE_COOKIE=true`, HTTPS-only cookies
- [ ] `AACT_ADMIN_TOTP_REQUIRED=true`
- [ ] Set `TRUSTED_PROXIES` to the Nginx upstream CIDR (not `*` in real deployments)
- [ ] Use `infra/nginx/production.conf.example` (TLS + HSTS + tighter CSP)
- [ ] Build API/web Docker **production** targets (`app` / `runner`), not `*-dev`
- [ ] ClamAV profile for document scanning (or accept quarantine-only when unavailable)
- [ ] Rotate integration credentials; never log plaintext tokens/HMAC secrets
- [ ] `PRIVATE_DOCUMENTS_DRIVER=s3`, `PRIVATE_DOCUMENTS_PREFIX=referrers-docs`, strong `AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY`, private bucket + credentials

## Observability

- API responses include `X-Correlation-Id` (echoed when provided).
- Audit events store action/actor/business/entity + optional `correlation_id` in context.
- Prefer stderr JSON/stack logs in containers (`LOG_CHANNEL=stderr`).
