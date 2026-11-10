# ADR-0006: Phase 3 ingestion, rules and ledger

## Status

Accepted

## Context

Phase 3 must accept authenticated commercial events from external systems, attribute them via referral codes, calculate commissions from versioned rules, and post balanced ledger entries. Retries and concurrent requests must not duplicate commissions or ledger movements.

## Decision

1. **Integration credentials** are first-class identities bound to one business, one website, and a stable `source`. Bearer tokens are stored hashed; HMAC secrets are stored encrypted. Website/business are derived from the credential, never trusted from the payload.
2. **Request authenticity** requires bearer + HMAC over `timestamp.nonce.raw_body`, a fresh nonce per credential, and a bounded timestamp skew.
3. **Idempotency** uses a unique `(business_id, source, external_event_id)` on `commercial_events`, a unique commission per event, and a unique ledger `idempotency_key` (`commission_accrual:{event_id}`). Duplicate inserts return the existing result.
4. **Rules** are versioned rows with `rate_bps` and optional `flat_minor`, scoped by business/website/event type, selected by highest priority then newest version among effective rows.
5. **Ledger** is append-only: each accrual posts debit (commission expense) and credit (referrer payable) in minor units. Entries must balance; imbalance aborts the transaction.
6. **Financial concurrency tests** run against MariaDB (group `mariadb`), not SQLite.

## Consequences

- Refunds/chargebacks and settlement remain Phase 4; they will reverse via new entries, never by deleting lines.
- SQLite suite remains for fast auth/onboarding smoke tests.
