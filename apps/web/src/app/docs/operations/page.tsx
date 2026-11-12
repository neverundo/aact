import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getOperationsPage } from "@/content/docs/pages/operations";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getOperationsPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function OperationsDocsPage() {
  return <DocsPageView slug="/docs/operations" />;
}
