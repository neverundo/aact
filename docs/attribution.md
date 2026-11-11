# Attribution

AACT attributes commissions from **normalized commercial events** sent by an external checkout. There is **no affiliate click cookie or session** in the MVP.

## End-to-end flow

1. Referrer shares a link with `?ref=CODE` (generated in the portal).
2. The **storefront / checkout** reads and persists `ref` (localStorage, server cart, etc.).
3. On conversion, checkout calls `POST /api/v1/integration/events` with:
   - `event_type: sale`
   - `referral_code: CODE`
   - `external_event_id` unique per order
   - HMAC headers (see [integrations/checkout.md](integrations/checkout.md))
4. AACT resolves an active referral code that:
   - belongs to the credential’s business
   - matches the credential website when the code is website-scoped
   - belongs to an **approved** referrer membership
5. AACT resolves a commission rule (business-wide or website-specific) and creates an immutable commission snapshot + ledger accrual.
6. If attribution fails, the event is retained as `ignored` with a reason (invalid code, inactive membership, no matching rule, etc.).

## What AACT does not do

- Does not set tracking cookies in the shopper browser.
- Does not capture “clicks” or dwell time.
- Does not invent a `referral_code` if the checkout omits it.

## Refunds and chargebacks

Send `event_type: refund` or `chargeback` with `related_external_event_id` pointing at the original sale’s `external_event_id`. Commission is clawed back proportionally against remaining payable balance.

## Demo

`make seed-demo` seeds:

- attributed sale `demo-sale-001` with `REF-DEMOCODE01`
- ignored sale `demo-sale-ignored-001` with invalid code
- partial refund `demo-refund-001`
