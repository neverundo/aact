"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  fetchMe,
  logout,
  updatePreferredLocale,
  type AuthUser,
} from "@/lib/auth";
import {
  getAppLocale,
  normalizeLocale,
  setAppLocale,
  type AppLocale,
} from "@/lib/locale";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const activeLocale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [savingLocale, setSavingLocale] = useState(false);
  const securityHref =
    user && !user.is_admin
      ? "/portal/security"
      : pathname.startsWith("/portal")
        ? "/portal/security"
        : "/admin/security";

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setUser(me);
        if (me.preferred_locale) {
          const preferred = normalizeLocale(me.preferred_locale);
          if (preferred !== getAppLocale()) {
            setAppLocale(preferred);
            router.refresh();
          }
        }
      })
      .catch(() => setUser(null));
  }, [router]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function onLocaleChange(locale: AppLocale) {
    if (savingLocale || locale === activeLocale) return;
    setSavingLocale(true);
    try {
      const updated = await updatePreferredLocale(locale);
      setUser(updated);
      setAppLocale(locale);
      router.refresh();
    } finally {
      setSavingLocale(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-stone-900 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
          {user ? initials(user.name) : "…"}
        </span>
        <span className="sr-only">{tCommon("accountMenu")}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-md border border-stone-200 bg-white p-2 shadow-lg"
        >
          <div className="border-b border-stone-100 px-3 py-2">
            <p className="truncate text-sm font-medium text-stone-900">
              {user?.name ?? tCommon("account")}
            </p>
            <p className="truncate text-xs text-stone-500">
              {user?.email ?? t("loadingEmail")}
            </p>
          </div>
          <Link
            role="menuitem"
            href={securityHref}
            className="mt-1 block rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            onClick={() => setOpen(false)}
          >
            {t("security")}
          </Link>
          <div
            role="none"
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-stone-700"
          >
            <span>{t("language")}</span>
            <LanguageSwitcher
              locale={normalizeLocale(
                user?.preferred_locale ?? activeLocale,
              )}
              onChange={(locale) => {
                void onLocaleChange(locale);
              }}
              ariaLabel={t("languageSwitcher")}
            />
          </div>
          <button
            type="button"
            role="menuitem"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.replace("/login");
            }}
          >
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
