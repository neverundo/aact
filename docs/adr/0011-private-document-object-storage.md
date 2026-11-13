# ADR-0011: Encrypted private document object storage

## Status

Accepted

## Context

Portal referrers upload identity/supporting documents via `/portal` → Documentos. Phase 2 stored plaintext binaries on a local private disk. Staging/production need durable object storage and application-level encryption so bucket access alone cannot expose documents.

## Decision

1. Disk `private_documents` supports `PRIVATE_DOCUMENTS_DRIVER=local|s3`. S3 uses `AWS_*` with `root` = `PRIVATE_DOCUMENTS_PREFIX` (default `referrers-docs`). Staging/prod bucket, endpoint, and credentials stay in deploy secrets / local `.env.staging`, not in the repo.
2. Every write is application-encrypted (`aactdoc1:` + AES-256-CBC) with dedicated `AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY` (no silent `APP_KEY` write fallback). Downloads decrypt in the API; legacy plaintext objects remain readable.
3. Content sniffing (magic bytes + finfo) and ClamAV scan run on plaintext **before** encrypt/put. Infected/unavailable scans still persist metadata with fail-closed download.

## Consequences

- Operators must back up the encryption key and bucket objects alongside MariaDB.
- Local/dev defaults stay `local` + encryption key set in env/tests.
- UI/API contracts for portal document upload are unchanged.
