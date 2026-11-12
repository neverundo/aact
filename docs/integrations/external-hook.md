# External site hook (origin → AACT)

How an external storefront/backend (FitForge, Shopify app, custom Node checkout, POS) should call AACT after payment confirmation.

AACT never observes the checkout UI. The **origin system** validates PSP confirmation, then POSTs a signed commercial event.

## 1. Configure AACT (admin)

1. Create a **business** and **website** matching the origin origin (`/admin/businesses`).
2. Create a **commission rule** for that website (`/admin/commission-rules`).
3. Create an **integration credential** (`/admin/integrations`):
   - Prefer source `node_checkout` for ecommerce / Node backends.
   - Creating/rotating credentials requires **step-up** (admin password). Secrets appear **once**.
4. Copy `token` + `hmac_secret` into the origin environment (never into the browser).

Gateway URL is the same origin users open in the browser (local demo: `http://localhost:18080`).

## 2. Origin environment

```bash
# Origin backend (.env) — names may vary per product
AACT_ENABLED=true
AACT_URL=http://localhost:18080          # AACT gateway
AACT_TOKEN=aact_…                        # from Admin → Integrations
AACT_HMAC_SECRET=…                       # shown once on create/rotate
# Optional: keep source aligned with the credential
AACT_SOURCE=node_checkout
```

| Variable | Meaning |
| --- | --- |
| `AACT_URL` | AACT gateway base URL (no trailing slash required) |
| `AACT_TOKEN` | Bearer token from the integration credential |
| `AACT_HMAC_SECRET` | HMAC secret from the same create/rotate response |
| Credential `source` | Must match what you configured in admin (e.g. `node_checkout`) |

Rotate credentials in admin when leaked; historical idempotency keys stay valid for past `external_event_id`s under the same business+source.

## 3. When to call AACT

Hook **after** the sale is paid in the origin system (PSP webhook / provider evidence), not on “checkout started” or Multibanco reference creation.

Recommended shape:

1. Persist paid state in the origin DB (transaction).
2. Run local side-effects (ledger, fiscal outbox, …).
3. **Queue** an outbound job that POSTs to AACT so PSP confirmation is never blocked by AACT downtime.
4. On refunds/chargebacks, enqueue a separate event with `related_external_event_id` pointing at the sale.

Do **not**:

- Put bearer/HMAC secrets in the storefront.
- Treat a success page or `?paid=1` query as payment proof.
- Fail an already-paid sale because AACT is temporarily unavailable — retry with the **same** `external_event_id`.

## 4. Request contract

`POST {AACT_URL}/api/v1/integration/events`

Headers:

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer {AACT_TOKEN}` |
| `Content-Type` | `application/json` |
| `X-AACT-Timestamp` | Unix seconds |
| `X-AACT-Nonce` | Unique random string per attempt |
| `X-AACT-Signature` | `hex(hmac_sha256(secret, timestamp + "." + nonce + rawBody))` |

Sale body:

```json
{
  "external_event_id": "ff-attempt-<uuid>",
  "event_type": "sale",
  "occurred_at": "2026-11-12T12:00:00Z",
  "amount_minor": 4990,
  "currency": "EUR",
  "referral_code": "REF-…",
  "metadata": { "channel": "node_checkout", "plan": "training-pro" }
}
```

Refund body:

```json
{
  "external_event_id": "ff-refund-<uuid>",
  "event_type": "refund",
  "related_external_event_id": "ff-attempt-<uuid>",
  "occurred_at": "2026-11-12T13:00:00Z",
  "amount_minor": 2000,
  "currency": "EUR"
}
```

Business and website are **derived from the credential**, never trusted from the JSON body.

Idempotency key: `(business_id, source, external_event_id)`. Retries must reuse the same `external_event_id` and mint a new timestamp + nonce. Responses: `201` new, `200` replayed.

## 5. Preserve `?ref=` in the storefront

1. Read `?ref=` on landing and persist (cookie/session/order).
2. Carry it through cart/checkout.
3. Send it as `referral_code` on the sale event after payment is confirmed.

Without a matching AACT referral code, the event may be accepted but ignored for commission.

## 6. FitForge reference

FitForge `fit-api` implements this pattern:

- Config: `config/aact.php` + `AACT_*` env keys
- Client: `App\Services\Integrations\Aact\AactClient`
- Payload builder: `App\Services\Integrations\Aact\AactSaleNotifier`
- Queue: `App\Jobs\NotifyAactCommercialEventJob`
- Hooks: after PAID in `PaymentWebhookProcessor`, after succeeded refund in `PaymentRefundIngestionService`

Local smoke without FitForge:

```bash
export AACT_URL=http://localhost:18080
export AACT_TOKEN=…
export AACT_HMAC_SECRET=…
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs
```

See also [checkout.md](checkout.md), in-app `/docs/integrations/client` (PHP + TypeScript copy-paste), `/docs/integrations/checkout`, and `/docs/integrations/authentication`.
