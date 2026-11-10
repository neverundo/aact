# ADR-0001: Stack and monorepo layout

## Status

Accepted

## Context

AACT / AACommissionTool needs an executable modular monolith: Laravel API, Next.js portals, MariaDB, Redis, and Docker Compose. The repository started empty aside from a placeholder README.

## Decision

| Component | Choice | Rationale |
| --- | --- | --- |
| Layout | `apps/api`, `apps/web`, `infra/*`, `docs/*` | Matches product brief; keeps concerns separate without microservices |
| Backend | Laravel **13.40** (`laravel/laravel` **13.11** skeleton) | Current supported major (bug + security fixes) on PHP 8.3–8.5 |
| PHP (runtime) | **8.4** in containers; local host may be 8.5 | Broad image availability; compatible with Laravel 13 |
| Auth (web) | Laravel Sanctum **4.3** (cookie/session) | Spec requirement; SPA same-origin via Nginx |
| Database | MariaDB **11.4** | Spec requirement; LTS line suitable for financial constraints |
| Cache/queue | Redis **7.4** | Spec requirement; durable enough for queues in MVP |
| Frontend | Next.js **16.4** App Router, React **19**, TypeScript strict, Tailwind **4** | Spec requirement; App Router for `/admin` and `/portal` |
| Tests (API) | PHPUnit (Laravel default) | Consistent with skeleton; Pest can be reconsidered later without mixing |
| Static analysis | Larastan **3.14** / PHPStan **2.3**, Pint **1.32** | Spec requirement |
| Compose | Root `compose.yaml` with pinned image tags (no `latest`) | Reproducible local + CI builds |
| SonarQube DB | PostgreSQL **16** (optional profile) | Spec forbids MariaDB for SonarQube |
| Dev email | [localfakemail](https://github.com/neverundo/localfakemail) `main` (Compose git build) | Self-hosted SMTP capture with auth + UI; replaces Mailpit; no sibling clone required |

## Consequences

- Phase 0 delivers bootable Compose + health endpoints + baseline tests/CI, not domain features.
- Financial integration tests will later override PHPUnit’s default SQLite `:memory:` with MariaDB.
- shadcn/ui and lucide-react are deferred to Phase 1 UI work to avoid unused packages in Phase 0.
