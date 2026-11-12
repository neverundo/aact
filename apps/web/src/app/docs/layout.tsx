import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsShell } from "@/components/docs/DocsShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
