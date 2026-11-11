# Domain model

## Tenancy

- **Business** — commercial tenant (currency, payout threshold).
- **Website** — channel under a business (`base_url`, optional brand assets).
- **BusinessMembership** — user ↔ business with role `business_admin` or `referrer` and status `pending | approved | rejected | suspended`.

## Onboarding

- **Invitation** → pending referrer membership + website pivot.
- **PaymentMethodVersion** — append-only IBAN/MB Way versions (`pending_review | approved | rejected | superseded`).
- **PrivateDocument** — identity docs, quarantined until clean.

## Referral & integration

- **ReferralCode** — per membership, optionally per website.
- **IntegrationCredential** — business + website + unique `source`; bearer hash + encrypted HMAC secret.
- **CommercialEvent** — sale/refund/chargeback; idempotent on `(business, source, external_event_id)`.
- **CommissionRule** — versioned rate in bps; optional website scope.
- **Commission** — immutable snapshot of rule application.
- **Ledger** — append-only balanced entries (accrual, reversal, settlement).
- **PayoutRequest** — external settlement record.

## Branding

- **BusinessBranding** — colors + logo for portal/invite chrome.
- Website favicon/logo paths filled by fetch-from-`base_url` or left empty.

See [attribution.md](attribution.md) and [branding.md](branding.md).
