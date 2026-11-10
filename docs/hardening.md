# Hardening

## Nginx

Local Compose (`infra/nginx/default.conf`):

- `server_tokens off`
- Dotfile / `/storage/` deny
- Rate limit on `/api/`
- Security headers: nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options
- CSP with `frame-ancestors 'none'` and `object-src 'none'` (local allows `'unsafe-eval'` for Next.js web-dev HMR)

Production example: `infra/nginx/production.conf.example` — HTTP→HTTPS redirect, HSTS, CSP without `'unsafe-eval'`.

## Laravel

- Correlation ID middleware on every request
- CSRF except integration HMAC routes
- Trusted proxies via `TRUSTED_PROXIES` (explicit in production)
- Admin routes require full MFA session + optional mandatory TOTP
- Payment reveal requires step-up
- Integration tokens hashed; HMAC secrets encrypted at rest
- Ledger append-only; refunds/settlement never delete history

## Frontend

- No credentials in `localStorage`
- Sanctum cookie session + CSRF for mutations
- UI copy pt-PT; route guards are UX only — policies enforce on the API
