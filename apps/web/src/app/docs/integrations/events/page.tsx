import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getEventsPage } from "@/content/docs/pages/events";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getEventsPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function EventsDocsPage() {
  return <DocsPageView slug="/docs/integrations/events" />;
}
