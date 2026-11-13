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

  const ctaClassName =
    "inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition sm:w-auto";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AactLogo className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
                {t("brand")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight break-words text-stone-900 sm:text-3xl md:text-4xl">
                {t("title")}
              </h1>
            </div>
          </div>
          <LanguageSwitcher
            className="shrink-0 pt-1"
            locale={normalizeLocale(locale)}
            onChange={onLocaleChange}
            ariaLabel={tAccount("languageSwitcher")}
          />
        </div>

        <p className="text-base font-semibold tracking-tight break-words text-stone-900 sm:text-lg">
          {t("tagline")}
        </p>
        <p className="max-w-xl text-base text-stone-600 sm:text-lg">
          {t("description")}
        </p>
      </div>

      <nav
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        aria-label={t("navLabel")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            className={`${ctaClassName} bg-stone-900 text-white hover:bg-stone-700`}
            href="/login"
          >
            {t("login")}
          </Link>
          <Link
            className={`${ctaClassName} border border-stone-300 text-stone-900 hover:bg-stone-100`}
            href="/admin"
          >
            {t("admin")}
          </Link>
          <Link
            className={`${ctaClassName} border border-stone-300 text-stone-900 hover:bg-stone-100`}
            href="/portal"
          >
            {t("portal")}
          </Link>
        </div>
        <Link
          className={`${ctaClassName} border border-stone-300 text-stone-900 hover:bg-stone-100`}
          href="/docs"
        >
          {t("documentation")}
        </Link>
      </nav>
    </main>
  );
}
