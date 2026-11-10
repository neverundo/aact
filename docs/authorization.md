# Authorization (Phase 1)

## Roles

| Role | Storage | Scope |
| --- | --- | --- |
| `platform_admin` | `users.platform_role` | Explicit global access |
| `business_admin` | `business_memberships.role` | Assigned businesses only |
| `referrer` | `business_memberships.role` | Own memberships/profile (portal) |
| `integration` | bearer token (hashed) + HMAC secret (encrypted); business/website/source derived from credential | `events:write` |

## Enforcement

- Laravel Policies on `Business` and `Website`
- Query scoping by `accessibleBusinessIds()` / membership checks
- Never trust client-supplied `business_id` without authorization
- Admin route group requires `admin.access` middleware (full auth + admin role + TOTP policy when enabled)

## Tests

See `tests/Feature/Isolation/BusinessIsolationTest.php` for IDOR/BOLA coverage.
