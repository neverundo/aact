import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { DocsPageView } from "@/components/docs/DocsPageView";
import { getIdempotencyPage } from "@/content/docs/pages/idempotency";
import { normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const page = getIdempotencyPage(normalizeLocale(await getLocale()));
  return { title: page.title, description: page.description };
}

export default function IdempotencyDocsPage() {
  return <DocsPageView slug="/docs/integrations/idempotency" />;
}
