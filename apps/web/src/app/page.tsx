"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AactLogo } from "@/components/AactLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  normalizeLocale,
  setAppLocale,
  type AppLocale,
} from "@/lib/locale";

export default function HomePage() {
  const t = useTranslations("home");
  const tAccount = useTranslations("account");
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  function onLocaleChange(next: AppLocale) {
    if (next === normalizeLocale(locale)) return;
    setAppLocale(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AactLogo className="h-14 w-14 sm:h-16 sm:w-16" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
                {t("brand")}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
                {t("title")}
              </h1>
            </div>
          </div>
          <LanguageSwitcher
            locale={normalizeLocale(locale)}
            onChange={onLocaleChange}
            ariaLabel={tAccount("languageSwitcher")}
          />
        </div>

        <p className="text-lg font-semibold tracking-tight text-stone-900">
          {t("tagline")}
        </p>
        <p className="max-w-xl text-lg text-stone-600">{t("description")}</p>
      </div>

      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label={t("navLabel")}
      >
        <div className="flex flex-wrap gap-3">
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
        </div>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          href="/docs"
        >
          {t("documentation")}
        </Link>
      </nav>
    </main>
  );
}
