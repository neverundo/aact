# ADR-0008: Phase 5 quality and presentation

## Status

Accepted

## Context

Phase 5 closes the portfolio slice: E2E coverage, production hardening, honest Sonar/security scanning, demo data, integration examples, and presentation docs — without inventing auth bypasses or claiming CI reaches localhost SonarQube.

## Decision

1. **E2E** uses Playwright against the Compose gateway (`BASE_URL`, default `http://localhost:18080`). Demo users include a documented local-only TOTP secret so MFA is exercised for real, not skipped.
2. **Hardening** adds Content-Security-Policy (frame-ancestors + object-src none), correlation IDs on API responses, explicit trusted proxies for production behind Nginx, and a separate production Nginx example with TLS/HSTS (not enabled on the local Compose profile).
3. **Sonar** remains optional Compose profile + local scanner against coverage artifacts. GitHub Actions publishes coverage when generated; it does not pretend to gate on localhost Sonar.
4. **OpenAPI** is maintained as a curated `docs/openapi.yaml` for the integration and portal/admin surface used in demos.
5. **Demo seed** expands synthetic business data (rule, referral code, approved payment path) and refuses non-local environments.

## Consequences

- Recruiters can walk `docs/demo-walkthrough.md` end-to-end on a clean `make setup`.
- Production operators must enable TLS/HSTS via the production Nginx profile explicitly.
