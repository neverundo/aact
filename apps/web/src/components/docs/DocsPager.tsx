import Link from "next/link";
import { docsPageOrder } from "@/content/docs/nav";
import { getDocPage, type DocLocale } from "@/content/docs";

export function DocsPager({
  slug,
  locale,
  previousLabel,
  nextLabel,
}: {
  slug: string;
  locale: DocLocale;
  previousLabel: string;
  nextLabel: string;
}) {
  const index = docsPageOrder.indexOf(slug);
  if (index < 0) return null;

  const previousSlug = index > 0 ? docsPageOrder[index - 1] : null;
  const nextSlug =
    index < docsPageOrder.length - 1 ? docsPageOrder[index + 1] : null;
  const previous = previousSlug ? getDocPage(previousSlug, locale) : null;
  const next = nextSlug ? getDocPage(nextSlug, locale) : null;

  if (!previous && !next) return null;

  return (
    <nav
      className="mt-14 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-2"
      aria-label="Pagination"
    >
      {previous && previousSlug ? (
        <Link
          href={previousSlug}
          className="rounded-md border border-stone-200 bg-white/70 px-4 py-3 transition hover:border-stone-400"
        >
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
            {previousLabel}
          </p>
          <p className="mt-1 font-medium text-stone-900">{previous.title}</p>
        </Link>
      ) : (
        <span />
      )}
      {next && nextSlug ? (
        <Link
          href={nextSlug}
          className="rounded-md border border-stone-200 bg-white/70 px-4 py-3 text-right transition hover:border-stone-400 sm:justify-self-end"
        >
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
            {nextLabel}
          </p>
          <p className="mt-1 font-medium text-stone-900">{next.title}</p>
        </Link>
      ) : null}
    </nav>
  );
}
