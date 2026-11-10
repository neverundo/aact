# ADR-0004: Phase 1 identity, MFA and isolation

## Status

Accepted

## Context

Phase 1 requires Sanctum cookie sessions, MFA that cannot be bypassed, and strict business isolation. The product forbids creating a fully authenticated session after password alone when a second factor is required.

## Decision

1. **Roles**
   - `platform_admin` stored on `users.platform_role`.
   - `business_admin` and `referrer` stored on `business_memberships.role`.
   - Integration identities remain out of Phase 1.

2. **Login**
   - Password verification never opens a full session when MFA is enrolled.
   - A short-lived `auth_challenges` row (hashed token, attempt limit, expiry) gates MFA verify.
   - Platform/business admins without confirmed TOTP receive only an `mfa_setup_only` session after password; admin APIs stay forbidden until TOTP is confirmed.
   - Production policy: admin TOTP is mandatory (`config('aact.mfa.admin_totp_required')`, true when `APP_ENV=production`).

3. **Factors**
   - TOTP via `pragmarx/google2fa` (local secret, encrypted at rest).
   - Email OTP as a weaker alternative for non-admin users; never a silent fallback when admin TOTP is required.
   - Recovery codes hashed (one-time, atomic consume).
   - Step-up reauth stores `step_up_confirmed_until` in session (default 15 minutes).

4. **Isolation**
   - Business queries scoped by membership (or explicit platform admin).
   - Policies deny cross-business access; IDOR feature tests cover businesses/websites.

5. **Password hashing**
   - `HASH_DRIVER=argon2id` when the runtime supports it.

## Consequences

- Frontend must treat `/api/v1/auth/me` flags (`mfa_setup_only`, `mfa_required`, `step_up_active`) as UX hints only.
- Email OTP is documented as lower assurance than TOTP.
