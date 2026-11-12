import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getApiPage } from "@/content/docs/pages/api";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getApiPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function ApiDocsPage() {
  return <DocsPageView slug="/docs/api" />;
}
