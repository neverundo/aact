# Demo walkthrough

Synthetic local demo only. Never use these credentials outside `local`/`testing`.

## Boot

```bash
make setup
make seed-demo
```

Gateway: http://localhost:18080

## Accounts

| Email | Password | MFA |
| --- | --- | --- |
| `platform@aact.test` | `platform-passphrase` | TOTP secret `JBSWY3DPEHPK3PXP` |
| `admin@aact.test` | `admin-passphrase` | TOTP secret `JBSWY3DPEHPK3PXP` |
| `referrer@aact.test` | `referrer-passphrase` | none |

`platform` / `admin` go to `/login/mfa` after the password step — add `JBSWY3DPEHPK3PXP` to an authenticator (or use the E2E helper). `referrer` has no MFA.

Use `http://localhost:18080` (or `http://127.0.0.1:18080`) consistently — session cookies are host-only. After a re-seed, login should work without clearing cookies (DemoSeeder avoids unnecessary password re-hash; SoftAuthenticateSession skips the stale password-hash gate on auth entrypoints).

Also seeded: business `demo-business`, website `https://demo.example`, referral `REF-DEMOCODE01`, 10% sale rule, approved IBAN + clean document, payout threshold `1000` minor units, demo branding colors, and attribution outcomes:

- attributed sale `demo-sale-001`
- ignored sale `demo-sale-ignored-001` (invalid code)
- partial refund `demo-refund-001`

Integration credentials for `demo_checkout` are printed **once** on first seed (`AACT_TOKEN` / `AACT_HMAC_SECRET`). Rotate in `/admin/integrations` if lost.

## Happy path (manual)

1. Login as admin → MFA → `/admin`.
2. Open `/admin/events` and `/admin/memberships` — seed already shows attributed + ignored events and the referrer member identity.
3. Optional: `/admin/businesses` → detalhe → branding / websites / integrations shortcuts.
4. Login as referrer → `/portal` → see branded chrome (if configured), code, balances, payout form.
5. Post an additional sale (optional):

```bash
export AACT_URL=http://localhost:18080
export AACT_TOKEN=…
export AACT_HMAC_SECRET=…
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs
```

6. Optional refund: `RELATED_EXTERNAL_EVENT_ID=… node examples/node-checkout/post-refund.mjs`
7. Optional offline till: `node examples/offline-sale/post-offline-sale.mjs`
8. Referrer requests payout (select clean doc) → admin `/admin/payout-requests` → approve → mark paid with SEPA reference.

Docs: [attribution.md](attribution.md), [integrations/checkout.md](integrations/checkout.md), [guides/admin.md](guides/admin.md), [branding.md](branding.md).

## Automated E2E

```bash
make seed-demo
make test-e2e
```

Playwright covers public a11y smoke, admin MFA login, and referrer portal (desktop + mobile projects).
