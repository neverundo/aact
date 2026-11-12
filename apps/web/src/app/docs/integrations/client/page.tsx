import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getIntegrationClientPage } from "@/content/docs/pages/integration-client";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getIntegrationClientPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function IntegrationClientDocsPage() {
  return <DocsPageView slug="/docs/integrations/client" />;
}
