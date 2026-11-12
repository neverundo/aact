import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getIntegrationAuthPage } from "@/content/docs/pages/integration-auth";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getIntegrationAuthPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function IntegrationAuthDocsPage() {
  return <DocsPageView slug="/docs/integrations/authentication" />;
}
