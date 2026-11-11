export type HelpKey =
  | "admin.businesses"
  | "admin.business-detail"
  | "admin.business-branding"
  | "admin.memberships"
  | "admin.payment-methods"
  | "admin.integrations"
  | "admin.commission-rules"
  | "admin.invitations"
  | "admin.events"
  | "admin.payout-requests"
  | "portal.home";

export const HELP_KEYS: readonly HelpKey[] = [
  "admin.businesses",
  "admin.business-detail",
  "admin.business-branding",
  "admin.memberships",
  "admin.payment-methods",
  "admin.integrations",
  "admin.commission-rules",
  "admin.invitations",
  "admin.events",
  "admin.payout-requests",
  "portal.home",
] as const;
