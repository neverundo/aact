# Authentication (Phase 1)

## Browser sessions

- Same-origin via Nginx (`/api/*`, `/sanctum/*` → Laravel).
- Sanctum SPA cookies + CSRF (`/sanctum/csrf-cookie`, `X-XSRF-TOKEN`).
- Session cookie: HttpOnly; `SameSite=Lax`; `Secure` in production.
- Credentials are never stored in `localStorage` / `sessionStorage`.
- MFA challenge tokens may be held briefly in `sessionStorage` only for the MFA step UI.

## Login

1. `POST /api/v1/auth/login` validates email/password (generic errors; rate limited).
2. If MFA is enrolled → `auth_challenges` row + `mfa_required` (no full session).
3. `POST /api/v1/auth/mfa/verify` consumes the challenge and creates the session.
4. Admins without confirmed TOTP get `mfa_setup_only` session; admin APIs return 403 until TOTP is confirmed.

## MFA

| Factor | Notes |
| --- | --- |
| TOTP | `pragmarx/google2fa`, secret encrypted at rest, QR generated locally, replay protected via last timestep |
| Email OTP | Weaker assurance; never silent admin TOTP bypass |
| Recovery codes | Hashed, single-use, atomic consume |

Step-up: `POST /api/v1/auth/step-up` sets a short-lived session flag (default 15 minutes) required for sensitive MFA changes.

## Roles

- `platform_admin` on `users.platform_role`
- `business_admin` / `referrer` on `business_memberships`
- Isolation enforced with Policies + membership checks (see IDOR tests)
