import { getLocale, getTranslations } from "next-intl/server";
import { getDocPage, type DocLocale } from "@/content/docs";
import { normalizeLocale } from "@/lib/locale";
import { DocsArticle } from "./DocsArticle";
import { DocsPager } from "./DocsPager";
import { notFound } from "next/navigation";

export async function DocsPageView({ slug }: { slug: string }) {
  const locale = normalizeLocale(await getLocale()) as DocLocale;
  const page = getDocPage(slug, locale);
  if (!page) notFound();

  const t = await getTranslations("docs");

  return (
    <>
      <DocsArticle
        page={page}
        locale={locale}
        copyLabel={t("copy")}
        copiedLabel={t("copied")}
      />
      <DocsPager
        slug={slug}
        locale={locale}
        previousLabel={t("previous")}
        nextLabel={t("next")}
      />
    </>
  );
}
