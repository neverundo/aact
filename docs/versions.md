# Pinned versions (Phase 0)

Recorded at implementation time (2026-11-09).

| Component | Version |
| --- | --- |
| laravel/laravel (skeleton) | 13.11.0 |
| laravel/framework | 13.40.0 |
| laravel/sanctum | 4.3.3 |
| larastan/larastan | 3.14.0 |
| phpstan/phpstan | 2.3.5 |
| laravel/pint | 1.32.1 |
| phpunit/phpunit | 12.5.43 |
| PHP (containers) | 8.4.27-fpm-bookworm |
| Composer (image) | 2.8.8 |
| Next.js | 16.4.5 |
| React | 19.3.0 |
| Node (containers) | 22.16.0-bookworm-slim |
| MariaDB | 11.4.5 |
| Redis | 7.4.2-alpine |
| Nginx | 1.27.5-alpine |
| localfakemail | [neverundo/localfakemail](https://github.com/neverundo/localfakemail) `a0c0d7d5d8294e4c896e56ce4ec40b299bac4360` (Compose git build pinned; Postgres 16.8-alpine) |
| ClamAV | 1.4.2 |
| SonarQube (Compose profile) | 25.5.0.107428-community |
| SonarQube (local host :9000) | community (operator-managed; currently 26.x) |
| PostgreSQL (Sonar Compose) | 16.8-alpine |
| Playwright | 1.56.1 |
| Sonar Scanner CLI (local) | sonarsource/sonar-scanner-cli:latest |
| GitHub runner image target | ubuntu-24.04 |
| pragmarx/google2fa | 8.0.3 |
| bacon/bacon-qr-code | 3.1.1 |

No `latest` tags are used in Compose/Dockerfiles.

Phase 1 packages: Google2FA + BaconQrCode (local TOTP/QR; no external MFA SaaS).
