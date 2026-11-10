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

Also seeded: business `demo-business`, website `https://demo.example`, referral `REF-DEMOCODE01`, 10% sale rule, approved IBAN + clean document, payout threshold `1000` minor units.

Integration credentials for `demo_checkout` are printed **once** on first seed (`AACT_TOKEN` / `AACT_HMAC_SECRET`). Rotate in `/admin/integrations` if lost.

## Happy path (manual)

1. Login as admin → MFA → `/admin`.
2. Confirm integrations, commission rules, events.
3. Login as referrer → `/portal` → see code + balances + payout form.
4. Post a sale:

```bash
export AACT_URL=http://localhost:18080
export AACT_TOKEN=…
export AACT_HMAC_SECRET=…
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs
```

5. Optional refund: `RELATED_EXTERNAL_EVENT_ID=… node examples/node-checkout/post-refund.mjs`
6. Optional offline till: `node examples/offline-sale/post-offline-sale.mjs`
7. Referrer requests payout (select clean doc) → admin `/admin/payout-requests` → approve → mark paid with SEPA reference.

## Automated E2E

```bash
make seed-demo
make test-e2e
```

Playwright covers public a11y smoke, admin MFA login, and referrer portal (desktop + mobile projects).
