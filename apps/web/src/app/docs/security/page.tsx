import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getSecurityPage } from "@/content/docs/pages/security";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getSecurityPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function SecurityDocsPage() {
  return <DocsPageView slug="/docs/security" />;
}
