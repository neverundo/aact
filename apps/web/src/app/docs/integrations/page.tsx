import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getIntegrationsHubPage } from "@/content/docs/pages/integrations-hub";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getIntegrationsHubPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function IntegrationsDocsPage() {
  return <DocsPageView slug="/docs/integrations" />;
}
