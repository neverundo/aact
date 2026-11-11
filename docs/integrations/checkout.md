# Checkout integration

Guide for connecting an external ecommerce / Node checkout (or POS) to AACT.

## Concepts

| Term | Meaning |
| --- | --- |
| **Credential** | Bearer token + HMAC secret bound to one business + website + `source` |
| **source** | Stable channel id (e.g. `node_checkout`). Unique per business. Used in event idempotency `(business, source, external_event_id)`. Not a runtime type. |
| **node_checkout** | Suggested source label for a Node/server checkout. Same behaviour as any other source. |

## Setup in admin

1. Create a **business** and **website** (`/admin/businesses`).
2. Create a **commission rule** scoped to that website (`/admin/commission-rules`).
3. Create an **integration credential** (`/admin/integrations`) with source `node_checkout` (or your own).
4. Store `token` and `hmac_secret` securely (shown once).

## Request

`POST /api/v1/integration/events`

Headers:

- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `X-AACT-Timestamp`: unix seconds
- `X-AACT-Nonce`: unique random string
- `X-AACT-Signature`: HMAC-SHA256 hex of `timestamp + "." + nonce + "." + rawBody` with `hmac_secret`

Sale body example:

```json
{
  "external_event_id": "ord-1001",
  "event_type": "sale",
  "occurred_at": "2026-11-10T12:00:00Z",
  "amount_minor": 10000,
  "currency": "EUR",
  "referral_code": "REF-DEMOCODE01",
  "metadata": { "channel": "node_checkout" }
}
```

Refund body example:

```json
{
  "external_event_id": "refund-1001",
  "event_type": "refund",
  "related_external_event_id": "ord-1001",
  "occurred_at": "2026-11-10T13:00:00Z",
  "amount_minor": 2000,
  "currency": "EUR"
}
```

## Preserve `ref` in the storefront

AACT does not track visits. Your app must:

1. Read `?ref=` on landing.
2. Persist it through cart/checkout.
3. Submit it as `referral_code` on the sale event.

## Local example

```bash
export AACT_URL=http://localhost:18080
export AACT_TOKEN=…
export AACT_HMAC_SECRET=…
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs
```

See also [attribution.md](../attribution.md) and [demo-walkthrough.md](../demo-walkthrough.md).
