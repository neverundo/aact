# node-checkout example

Minimal pattern for posting a signed sale event to AACT.

```bash
# After creating an integration in /admin/integrations:
export AACT_URL=http://localhost:18080
export AACT_TOKEN='aact_…'
export AACT_HMAC_SECRET='…'
export REFERRAL_CODE='REF-…'

node post-sale.mjs

# Partial/full refund or chargeback (clawback proportional, append-only ledger):
export RELATED_EXTERNAL_EVENT_ID='ord-…'   # original sale external_event_id
export AMOUNT_MINOR=5000
# export EVENT_TYPE=chargeback
node post-refund.mjs
```

Required headers:

- `Authorization: Bearer <token>`
- `X-AACT-Timestamp`: unix seconds
- `X-AACT-Nonce`: unique per request
- `X-AACT-Signature`: `hex(hmac_sha256(secret, timestamp + '.' + nonce + '.' + rawBody))`

Idempotency key is `external_event_id` scoped by credential `source` + business.
