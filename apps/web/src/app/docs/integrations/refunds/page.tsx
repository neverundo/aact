import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getRefundsPage } from "@/content/docs/pages/refunds";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getRefundsPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function RefundsDocsPage() {
  return <DocsPageView slug="/docs/integrations/refunds" />;
}
