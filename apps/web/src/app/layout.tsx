import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AppIntlProvider } from "@/components/AppIntlProvider";
import { htmlLangByLocale, type AppLocale } from "@/i18n/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

async function HtmlLang({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as AppLocale;
  return (
    <html lang={htmlLangByLocale[locale]} className="h-full antialiased">
      {children}
    </html>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <html lang="pt-PT" className="h-full antialiased">
          <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-900" />
        </html>
      }
    >
      <HtmlLang>
        <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-900">
          <Suspense fallback={null}>
            <AppIntlProvider>{children}</AppIntlProvider>
          </Suspense>
        </body>
      </HtmlLang>
    </Suspense>
  );
}
