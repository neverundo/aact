"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { breadcrumbsForPath } from "@/lib/nav";

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations();
  const crumbs = breadcrumbsForPath(pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label={t("common.breadcrumb")} className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-stone-500">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const label = crumb.labelKey.startsWith("nav.")
            ? t(crumb.labelKey)
            : crumb.labelKey;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-stone-300">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span
                  aria-current="page"
                  className="truncate font-medium text-stone-900"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate hover:text-stone-800"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
