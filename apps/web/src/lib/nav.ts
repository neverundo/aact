export type NavIconName =
  | "home"
  | "building"
  | "calendar"
  | "money"
  | "envelope"
  | "users"
  | "creditCard"
  | "plug"
  | "percent"
  | "shield"
  | "file"
  | "wallet"
  | "link";

export type NavItem = {
  href: string;
  labelKey: string;
  /** Short label key for collapsed rail */
  shortLabelKey?: string;
  icon: NavIconName;
};

export type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

export const adminNav: NavGroup[] = [
  {
    id: "overview",
    labelKey: "nav.groups.overview",
    items: [
      {
        href: "/admin",
        labelKey: "nav.admin.dashboard",
        shortLabelKey: "nav.admin.dashboardShort",
        icon: "home",
      },
    ],
  },
  {
    id: "operations",
    labelKey: "nav.groups.operations",
    items: [
      {
        href: "/admin/businesses",
        labelKey: "nav.admin.businesses",
        shortLabelKey: "nav.admin.businessesShort",
        icon: "building",
      },
      {
        href: "/admin/events",
        labelKey: "nav.admin.events",
        shortLabelKey: "nav.admin.eventsShort",
        icon: "calendar",
      },
      {
        href: "/admin/payout-requests",
        labelKey: "nav.admin.payouts",
        shortLabelKey: "nav.admin.payoutsShort",
        icon: "money",
      },
    ],
  },
  {
    id: "people",
    labelKey: "nav.groups.people",
    items: [
      {
        href: "/admin/invitations",
        labelKey: "nav.admin.invitations",
        shortLabelKey: "nav.admin.invitationsShort",
        icon: "envelope",
      },
      {
        href: "/admin/payment-methods",
        labelKey: "nav.admin.paymentMethods",
        shortLabelKey: "nav.admin.paymentMethodsShort",
        icon: "creditCard",
      },
      {
        href: "/admin/memberships",
        labelKey: "nav.admin.memberships",
        shortLabelKey: "nav.admin.membershipsShort",
        icon: "users",
      },
    ],
  },
  {
    id: "config",
    labelKey: "nav.groups.config",
    items: [
      {
        href: "/admin/integrations",
        labelKey: "nav.admin.integrations",
        shortLabelKey: "nav.admin.integrationsShort",
        icon: "plug",
      },
      {
        href: "/admin/commission-rules",
        labelKey: "nav.admin.rules",
        shortLabelKey: "nav.admin.rulesShort",
        icon: "percent",
      },
      {
        href: "/admin/security",
        labelKey: "nav.admin.security",
        shortLabelKey: "nav.admin.securityShort",
        icon: "shield",
      },
    ],
  },
];

export const portalNav: NavGroup[] = [
  {
    id: "portal",
    labelKey: "nav.groups.portal",
    items: [
      {
        href: "/portal#memberships",
        labelKey: "nav.portal.memberships",
        shortLabelKey: "nav.portal.membershipsShort",
        icon: "users",
      },
      {
        href: "/portal#pagamento",
        labelKey: "nav.portal.payment",
        shortLabelKey: "nav.portal.paymentShort",
        icon: "creditCard",
      },
      {
        href: "/portal#documentos",
        labelKey: "nav.portal.documents",
        shortLabelKey: "nav.portal.documentsShort",
        icon: "file",
      },
      {
        href: "/portal#saldos",
        labelKey: "nav.portal.balances",
        shortLabelKey: "nav.portal.balancesShort",
        icon: "wallet",
      },
      {
        href: "/portal#payouts",
        labelKey: "nav.portal.payouts",
        shortLabelKey: "nav.portal.payoutsShort",
        icon: "money",
      },
      {
        href: "/portal#referral",
        labelKey: "nav.portal.referral",
        shortLabelKey: "nav.portal.referralShort",
        icon: "link",
      },
    ],
  },
  {
    id: "account",
    labelKey: "nav.groups.account",
    items: [
      {
        href: "/portal/security",
        labelKey: "nav.portal.security",
        shortLabelKey: "nav.portal.securityShort",
        icon: "shield",
      },
    ],
  },
];

const breadcrumbKeys: Record<string, string> = {
  admin: "nav.breadcrumbs.admin",
  portal: "nav.breadcrumbs.portal",
  businesses: "nav.breadcrumbs.businesses",
  branding: "nav.breadcrumbs.branding",
  events: "nav.breadcrumbs.events",
  "payout-requests": "nav.breadcrumbs.payoutRequests",
  invitations: "nav.breadcrumbs.invitations",
  memberships: "nav.breadcrumbs.memberships",
  "payment-methods": "nav.breadcrumbs.paymentMethods",
  integrations: "nav.breadcrumbs.integrations",
  "commission-rules": "nav.breadcrumbs.commissionRules",
  security: "nav.breadcrumbs.security",
};

export type BreadcrumbItem = {
  href: string;
  /** Message key (e.g. nav.breadcrumbs.admin) or raw segment fallback */
  labelKey: string;
};

export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: BreadcrumbItem[] = [];
  let acc = "";

  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({
      href: acc,
      labelKey: breadcrumbKeys[segment] ?? segment,
    });
  }

  return crumbs;
}

export function isNavItemActive(
  href: string,
  pathname: string,
  hash: string,
): boolean {
  const [path, itemHash] = href.split("#");
  if (itemHash) {
    return pathname === path && hash.replace(/^#/, "") === itemHash;
  }
  if (path === "/admin") {
    return pathname === "/admin";
  }
  if (path === "/portal") {
    return pathname === "/portal" && !hash;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
