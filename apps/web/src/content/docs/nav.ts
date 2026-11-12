import type { DocNavItem } from "./types";

/** Navigation for selected --docs sections only. */
export const docsNav: DocNavItem[] = [
  { href: "/docs", labelKey: "nav.overview" },
  { href: "/docs/getting-started", labelKey: "nav.gettingStarted" },
  {
    href: "/docs/integrations",
    labelKey: "nav.integrations",
    children: [
      { href: "/docs/integrations/checkout", labelKey: "nav.checkout" },
      { href: "/docs/integrations/client", labelKey: "nav.integrationClient" },
      { href: "/docs/integrations/events", labelKey: "nav.events" },
      {
        href: "/docs/integrations/authentication",
        labelKey: "nav.integrationAuth",
      },
      { href: "/docs/integrations/idempotency", labelKey: "nav.idempotency" },
      { href: "/docs/integrations/refunds", labelKey: "nav.refunds" },
    ],
  },
  { href: "/docs/api", labelKey: "nav.api" },
  { href: "/docs/security", labelKey: "nav.security" },
  { href: "/docs/operations", labelKey: "nav.operations" },
];

export const docsPageOrder: string[] = [
  "/docs",
  "/docs/getting-started",
  "/docs/integrations",
  "/docs/integrations/checkout",
  "/docs/integrations/client",
  "/docs/integrations/events",
  "/docs/integrations/authentication",
  "/docs/integrations/idempotency",
  "/docs/integrations/refunds",
  "/docs/api",
  "/docs/security",
  "/docs/operations",
];
