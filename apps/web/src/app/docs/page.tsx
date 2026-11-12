import type { Metadata } from "next";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getOverviewPage } from "@/content/docs/pages/overview";
import { normalizeLocale } from "@/lib/locale";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const page = getOverviewPage(locale);
  return {
    title: page.title,
    description: page.description,
  };
}

export default function DocsOverviewPage() {
  return <DocsPageView slug="/docs" />;
}
