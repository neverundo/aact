# Checkout integration

Guide for connecting an external ecommerce / Node checkout (or POS) to AACT.

For a full origin-system playbook (env vars, hook timing, FitForge reference), see **[external-hook.md](external-hook.md)**.

## Concepts

| Term | Meaning |
| --- | --- |
| **Credential** | Bearer token + HMAC secret bound to one business + website + `source` |
| **source** | Stable channel id (e.g. `node_checkout`). Unique per business. Used in event idempotency `(business, source, external_event_id)`. Not a runtime type. |
| **node_checkout** | Suggested source label for a Node/server checkout. Same behaviour as any other source. |
| **AACT_URL** | Gateway base URL of the AACT deployment (local demo: `http://localhost:18080`) |

## Setup in admin

1. Create a **business** and **website** (`/admin/businesses`).
2. Create a **commission rule** scoped to that website (`/admin/commission-rules`).
3. Create an **integration credential** (`/admin/integrations`) with source `node_checkout` (or your own).
   - Create/rotate requires **step-up** (admin password confirmation).
4. Store `token` and `hmac_secret` securely (shown once).

## Origin environment

Configure the **backend** of the external site (never the browser):

```bash
AACT_ENABLED=true                 # product-specific kill switch (optional)
AACT_URL=http://localhost:18080   # AACT gateway
AACT_TOKEN=aact_…                 # from admin create/rotate
AACT_HMAC_SECRET=…                # shown once
# Credential source in admin should match your channel, e.g. node_checkout
```

| Origin concern | Guidance |
| --- | --- |
| When to POST | After PSP-confirmed paid state is persisted locally |
| Blocking | Prefer a queued job; do not fail the paid sale if AACT is down |
| Retries | Same `external_event_id`, new timestamp + nonce each attempt |
| Refunds | Separate event with `related_external_event_id` = original sale id |

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

See also [external-hook.md](external-hook.md), [attribution.md](../attribution.md) and [demo-walkthrough.md](../demo-walkthrough.md).
