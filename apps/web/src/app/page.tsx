"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          {t("brand")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          {t("title")}
        </h1>
        <p className="text-lg font-semibold tracking-tight text-stone-900">
          {t("tagline")}
        </p>
        <p className="max-w-xl text-lg text-stone-600">{t("description")}</p>
      </div>

      <nav className="flex flex-wrap gap-3" aria-label={t("navLabel")}>
        <Link
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          href="/login"
        >
          {t("login")}
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          href="/admin"
        >
          {t("admin")}
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          href="/portal"
        >
          {t("portal")}
        </Link>
      </nav>
    </main>
  );
}
