"use client";

import { useTranslations } from "next-intl";

export default function DocsPage() {
  const t = useTranslations("docs");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
        {t("title")}
      </h1>
    </main>
  );
}
