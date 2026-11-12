import type { DocLocale, DocPage } from "./types";
import { getApiPage } from "./pages/api";
import { getCheckoutPage } from "./pages/checkout";
import { getEventsPage } from "./pages/events";
import { getGettingStartedPage } from "./pages/getting-started";
import { getIdempotencyPage } from "./pages/idempotency";
import { getIntegrationAuthPage } from "./pages/integration-auth";
import { getIntegrationsHubPage } from "./pages/integrations-hub";
import { getOperationsPage } from "./pages/operations";
import { getOverviewPage } from "./pages/overview";
import { getRefundsPage } from "./pages/refunds";
import { getSecurityPage } from "./pages/security";

const loaders: Record<string, (locale: DocLocale) => DocPage> = {
  "/docs": getOverviewPage,
  "/docs/getting-started": getGettingStartedPage,
  "/docs/integrations": getIntegrationsHubPage,
  "/docs/integrations/checkout": getCheckoutPage,
  "/docs/integrations/events": getEventsPage,
  "/docs/integrations/authentication": getIntegrationAuthPage,
  "/docs/integrations/idempotency": getIdempotencyPage,
  "/docs/integrations/refunds": getRefundsPage,
  "/docs/api": getApiPage,
  "/docs/security": getSecurityPage,
  "/docs/operations": getOperationsPage,
};

export function getDocPage(slug: string, locale: DocLocale): DocPage | null {
  const loader = loaders[slug];
  return loader ? loader(locale) : null;
}

export function listDocSlugs(): string[] {
  return Object.keys(loaders);
}

export type { DocLocale, DocPage } from "./types";
export { docsNav, docsPageOrder } from "./nav";
