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
  label: string;
  /** Short label for collapsed rail */
  shortLabel?: string;
  icon: NavIconName;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const adminNav: NavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        shortLabel: "Home",
        icon: "home",
      },
    ],
  },
  {
    id: "operations",
    label: "Operações",
    items: [
      {
        href: "/admin/businesses",
        label: "Businesses",
        shortLabel: "Biz",
        icon: "building",
      },
      {
        href: "/admin/events",
        label: "Eventos",
        shortLabel: "Evt",
        icon: "calendar",
      },
      {
        href: "/admin/payout-requests",
        label: "Payouts",
        shortLabel: "Pay",
        icon: "money",
      },
    ],
  },
  {
    id: "people",
    label: "Pessoas",
    items: [
      {
        href: "/admin/invitations",
        label: "Convites",
        shortLabel: "Inv",
        icon: "envelope",
      },
      {
        href: "/admin/memberships",
        label: "Memberships",
        shortLabel: "Mem",
        icon: "users",
      },
      {
        href: "/admin/payment-methods",
        label: "Métodos de pagamento",
        shortLabel: "PM",
        icon: "creditCard",
      },
    ],
  },
  {
    id: "config",
    label: "Configuração",
    items: [
      {
        href: "/admin/integrations",
        label: "Integrações",
        shortLabel: "Int",
        icon: "plug",
      },
      {
        href: "/admin/commission-rules",
        label: "Regras",
        shortLabel: "Reg",
        icon: "percent",
      },
      {
        href: "/admin/security",
        label: "Segurança",
        shortLabel: "Sec",
        icon: "shield",
      },
    ],
  },
];

export const portalNav: NavGroup[] = [
  {
    id: "portal",
    label: "Portal",
    items: [
      {
        href: "/portal#memberships",
        label: "Memberships",
        shortLabel: "Mem",
        icon: "users",
      },
      {
        href: "/portal#pagamento",
        label: "Pagamento",
        shortLabel: "Pag",
        icon: "creditCard",
      },
      {
        href: "/portal#documentos",
        label: "Documentos",
        shortLabel: "Doc",
        icon: "file",
      },
      {
        href: "/portal#saldos",
        label: "Saldos",
        shortLabel: "Sal",
        icon: "wallet",
      },
      {
        href: "/portal#payouts",
        label: "Payouts",
        shortLabel: "Out",
        icon: "money",
      },
      {
        href: "/portal#referral",
        label: "Referral",
        shortLabel: "Ref",
        icon: "link",
      },
    ],
  },
  {
    id: "account",
    label: "Conta",
    items: [
      {
        href: "/admin/security",
        label: "Segurança",
        shortLabel: "Sec",
        icon: "shield",
      },
    ],
  },
];

const breadcrumbLabels: Record<string, string> = {
  admin: "Admin",
  portal: "Portal",
  businesses: "Businesses",
  events: "Eventos",
  "payout-requests": "Payouts",
  invitations: "Convites",
  memberships: "Memberships",
  "payment-methods": "Métodos de pagamento",
  integrations: "Integrações",
  "commission-rules": "Regras",
  security: "Segurança",
};

export type BreadcrumbItem = {
  href: string;
  label: string;
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
      label: breadcrumbLabels[segment] ?? segment,
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
