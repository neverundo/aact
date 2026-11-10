# ADR-0007: Phase 4 refunds, chargebacks and settlement

## Status

Accepted

## Context

Phase 4 must reverse commissions when sales are refunded/charged back and allow referrers to request external payouts once a threshold is met, without the platform moving money. History must remain append-only.

## Decision

1. **Reversals** arrive as integration events (`refund` / `chargeback`) referencing `related_external_event_id`. Commission clawback is proportional to `refund_amount / original_amount`, capped by remaining reversible commission and current payable balance.
2. **Ledger** posts new balanced entries (`commission_reversal`, `payout_settlement`); never deletes or mutates prior lines. Reversal: debit payable, credit expense. Settlement: debit payable, credit settlement clearing.
3. **Payout requests** require approved membership, approved payment method version, at least one clean private document, and payable balance ≥ business `payout_threshold_minor`. Amount is locked at request time; concurrent requests cannot overdraw payable.
4. **Admin settlement** records an externally completed payment (`paid`) which posts the settlement ledger entry. Reject leaves payable untouched.

## Consequences

- Payable balance is the source of truth for eligibility and overdraw protection.
- Partial refunds leave commission `available` with accumulated `reversed_minor`; full reversal sets status `reversed`.
