"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLoginLocale } from "@/components/LoginLocaleProvider";

export function AuthShell({
  title,
  children,
  footerStart,
}: {
  title: string;
  children: ReactNode;
  footerStart?: ReactNode;
}) {
  const t = useTranslations("auth");
  const tAccount = useTranslations("account");
  const { locale, setLocale } = useLoginLocale();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2">
        <Link
          href="/"
          className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase"
        >
          AACT
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
      </div>
      {children}
      <div className="flex items-center justify-between gap-4 text-sm text-stone-500">
        <div>
          {footerStart ?? (
            <Link href="/" className="underline-offset-2 hover:underline">
              {t("backHome")}
            </Link>
          )}
        </div>
        <LanguageSwitcher
          locale={locale}
          onChange={setLocale}
          ariaLabel={tAccount("languageSwitcher")}
        />
      </div>
    </main>
  );
}
