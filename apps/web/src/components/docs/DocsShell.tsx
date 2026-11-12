"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AactLogo } from "@/components/AactLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  normalizeLocale,
  setAppLocale,
  type AppLocale,
} from "@/lib/locale";
import { DocsSidebar } from "./DocsSidebar";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("docs");
  const tAccount = useTranslations("account");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function onLocaleChange(next: AppLocale) {
    if (next === normalizeLocale(locale)) return;
    setAppLocale(next);
    router.refresh();
  }

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,_#f5f5f4_0%,_#fafaf9_45%,_#f0ebe3_100%)]">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-900 hover:bg-white lg:hidden"
              aria-expanded={open}
              aria-controls="docs-mobile-nav"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? t("closeNav") : t("openNav")}
            </button>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-stone-800 uppercase"
            >
              <AactLogo className="h-8 w-8" />
              <span>{t("brand")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              locale={normalizeLocale(locale)}
              onChange={onLocaleChange}
              ariaLabel={tAccount("languageSwitcher")}
            />
            <Link
              href="/"
              className="hidden min-h-11 items-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-900 hover:bg-white sm:inline-flex"
            >
              {t("home")}
            </Link>
          </div>
        </div>
        {open ? (
          <div
            id="docs-mobile-nav"
            className="border-t border-stone-200 bg-stone-50 px-4 py-4 lg:hidden"
          >
            <DocsSidebar onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">
              {t("sidebarTitle")}
            </p>
            <DocsSidebar />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
