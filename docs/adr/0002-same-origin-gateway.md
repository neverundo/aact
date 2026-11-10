# ADR-0002: Same-origin Nginx gateway

## Status

Accepted

## Context

Web portals (Next.js) and the Laravel API must share a secure cookie session via Sanctum without storing credentials in browser storage. Cross-site cookies complicate `SameSite` and CSRF.

## Decision

Expose a single origin through Nginx:

- `/api/*` and `/sanctum/*` → `api` (php-fpm / Laravel public)
- `/up` → Laravel framework health
- everything else → `web` (Next.js)

Development Compose publishes host port **18080** to Nginx by default (`HTTP_PORT`). Application URLs use `http://localhost:18080`.

## Consequences

- Sanctum SPA auth can use `SameSite=Lax`, host-only cookies, and `/sanctum/csrf-cookie`.
- Next.js rewrites are not required for API calls in the browser when using relative `/api` paths.
- TLS termination and HSTS belong to the production Nginx profile (Phase 5 hardening).
