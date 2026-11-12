import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getGettingStartedPage } from "@/content/docs/pages/getting-started";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getGettingStartedPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function GettingStartedDocsPage() {
  return <DocsPageView slug="/docs/getting-started" />;
}
