# Security Policy

## Supported versions

Phase 0–5 portfolio slice is complete for local/demo use. Treat production deployments as operator-owned: enable TLS/HSTS, mandatory admin TOTP, explicit trusted proxies, and secret rotation (see `docs/hardening.md` and `docs/operations.md`).

## Reporting a vulnerability

Do not open a public issue for security findings that expose credentials, personal data, or remote code execution paths.

Preferred path:

1. Contact the repository maintainer privately.
2. Include reproduction steps, affected component (`apps/api`, `apps/web`, `infra`), and impact.
3. Allow reasonable time for a fix before public disclosure.

## Non-goals for early phases

- The platform does not execute bank transfers.
- Demo seeds must never create authentication bypasses.
- Antivirus scanner unavailability must leave uploads in quarantine (no silent auto-approve).
