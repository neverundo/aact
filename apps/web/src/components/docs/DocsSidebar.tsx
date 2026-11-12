"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { docsNav } from "@/content/docs/nav";

function isActive(href: string, pathname: string): boolean {
  if (href === "/docs") return pathname === "/docs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("docs");

  return (
    <nav aria-label={t("navLabel")} className="space-y-6 text-sm">
      {docsNav.map((item) => (
        <div key={item.href} className="space-y-2">
          <Link
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-md px-2 py-1.5 font-medium transition ${
              isActive(item.href, pathname)
                ? "bg-stone-900 text-white"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {t(item.labelKey)}
          </Link>
          {item.children ? (
            <ul className="space-y-1 border-l border-stone-200 pl-3">
              {item.children.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-2 py-1.5 transition ${
                      pathname === child.href
                        ? "bg-stone-200 font-medium text-stone-900"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    {t(child.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
