# ADR-0005: Phase 2 invitations, payment data and referral codes

## Status

Accepted

## Context

Phase 2 must take a referrer from admin invitation to approval with versioned payment details, private document quarantine, and referral artefacts. Financial movement remains out of scope.

## Decision

1. **Invitations** store only a SHA-256 hash of a high-entropy token. `GET` preview never consumes; acceptance is an explicit `POST`. Existing accounts must authenticate as that email before linking a membership.
2. **Participation state** lives on `business_memberships.status` (`pending|approved|rejected|suspended`) and stays separate from email verification and payment review.
3. **Payment methods** are append-only versions (`payment_method_versions`). Sensitive fields are encrypted; APIs return masked values unless step-up + policy allow reveal (audited).
4. **Documents** land on the private disk under random names with MIME sniffing. Scan status starts as `quarantine`. A `FileScanner` port has ClamAV and Unavailable implementations; unavailable scanners never auto-approve.
5. **Referral codes** are created only for approved memberships, non-sequential, scoped unique per business, and links may only target administrator-approved website base URLs.

## Consequences

- Antivirus Compose profile remains optional; uploads stay quarantined when ClamAV is down.
- Payout eligibility (Phase 4) will require an approved payment version + clean documents.
