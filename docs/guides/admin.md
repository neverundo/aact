# Admin UI guide

Map of admin screens. Each screen also has an in-app **Ajuda** button.

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/businesses` | List/create businesses |
| `/admin/businesses/:id` | Edit business + manage websites |
| `/admin/businesses/:id/branding` | Colors, logo, website favicon fetch |
| `/admin/invitations` | Invite referrers |
| `/admin/memberships` | Review referrer memberships (member identity, websites, codes) |
| `/admin/payment-methods` | Payment method history by status |
| `/admin/integrations` | Credentials, rotate/revoke, checkout guide |
| `/admin/commission-rules` | Rules with business/website scope |
| `/admin/events` | Commercial events |
| `/admin/payout-requests` | Settlement approvals |
| `/admin/security` | MFA / sessions |

## Typical onboarding path

1. Create business → add website.
2. Create commission rule for that website.
3. Create integration credential (`source` e.g. `node_checkout`).
4. Invite referrer with website assignment.
5. Referrer submits payment method → admin approves → approve membership.
6. Checkout posts sales with `referral_code`.

## Authorization

UI is convenience; Laravel enforces platform admin / business admin scopes on every API call.
