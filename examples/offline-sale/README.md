# offline-sale example

Simulates a till/POS that captures a referral code offline and later posts a signed `sale` event.

Same contract as `examples/node-checkout` — HMAC + nonce + idempotent `external_event_id`.

```bash
export AACT_URL=http://localhost:18080
export AACT_TOKEN='aact_…'          # from make seed-demo
export AACT_HMAC_SECRET='…'
export REFERRAL_CODE=REF-DEMOCODE01

node post-offline-sale.mjs

# Safe to retry: same EXTERNAL_EVENT_ID returns replayed=true without double commission.
export EXTERNAL_EVENT_ID=pos-fixed-1
node post-offline-sale.mjs
node post-offline-sale.mjs
```
