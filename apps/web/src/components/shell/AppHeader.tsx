"use client";

import { useTranslations } from "next-intl";
import { AccountMenu } from "./AccountMenu";
import { Breadcrumbs } from "./Breadcrumbs";
import { useShell } from "./ShellProvider";

export function AppHeader() {
  const t = useTranslations("common");
  const { setMobileOpen, mobileOpen, collapsed, toggleCollapsed } = useShell();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-stone-50/95 px-0 backdrop-blur sm:gap-4 lg:px-1">
      {collapsed ? (
        <button
          type="button"
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 lg:inline-flex"
          aria-label={t("expandSidebar")}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          onClick={toggleCollapsed}
        >
          <MenuIcon />
        </button>
      ) : null}

      <button
        type="button"
        className="inline-flex mx-3 md:mx-4 min-h-11 min-w-11 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 lg:hidden"
        aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <AccountMenu />
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
