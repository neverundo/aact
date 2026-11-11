# ADR-0009: Business branding for portal chrome

## Status

Accepted

## Context

Operators need tenant branding (colors, logo, website favicon) for the referrer portal without opening `/storage` on the gateway or white-labeling the admin shell.

## Decision

1. Store branding on `business_brandings` and optional website asset paths.
2. Keep assets on a private `branding_assets` disk; stream via `/api/v1/branding/...` (rate-limited). Nginx continues to `deny` `/storage/`.
3. Apply branding only to portal (and public brand JSON); admin UI remains AACT chrome.
4. Website favicon/logo fetch is best-effort and never blocks CRUD.

## Consequences

- Portal can show tenant identity without a public storage symlink.
- Operators configure branding under `/admin/businesses/:id/branding`.
