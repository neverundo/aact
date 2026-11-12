"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { NavGroup } from "@/lib/nav";
import type { AppShellBrand } from "./brand";
import { usePortalBrand } from "./PortalBrandTheme";
import { SidebarNav } from "./SidebarNav";
import { useShell } from "./ShellProvider";

function subscribeIsLg(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getIsLgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getIsLgServerSnapshot() {
  return false;
}

function brandWords(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

function brandInitials(name: string): string {
  const words = brandWords(name);
  if (words.length === 0) return "A";
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return `${words[0]!.slice(0, 1)}${words[1]!.slice(0, 1)}`.toUpperCase();
}

export function Sidebar({
  groups,
  homeHref,
  brand,
}: {
  groups: NavGroup[];
  homeHref: string;
  brand?: AppShellBrand;
}) {
  const t = useTranslations("common");
  const { collapsed, mobileOpen, setMobileOpen, toggleCollapsed } = useShell();
  const portalBrand = usePortalBrand();
  const isLg = useSyncExternalStore(
    subscribeIsLg,
    getIsLgSnapshot,
    getIsLgServerSnapshot,
  );
  const railMode = collapsed && isLg;
  const markLabel = brand?.name ?? portalBrand.brandName ?? "AACT";
  const logoSrc = brand?.logoSrc ?? portalBrand.logoUrl;
  const words = brandWords(markLabel);
  const initials = brandInitials(markLabel);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label={t("closeMenu")}
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label={t("sideNav")}
        data-collapsed={railMode ? "true" : "false"}
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-60 shrink-0 flex-col border-r border-stone-200 bg-white transition-[width,transform] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          railMode ? "lg:w-16" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-14 shrink-0 items-center border-b border-stone-200",
            railMode
              ? "justify-center gap-0 px-1"
              : "justify-between gap-1 px-3",
          ].join(" ")}
        >
          <Link
            href={homeHref}
            className={[
              "flex min-w-0 items-center text-stone-900",
              railMode ? "justify-center" : "flex-1 gap-2.5 pl-3",
            ].join(" ")}
            onClick={() => setMobileOpen(false)}
            aria-label={markLabel}
            style={
              portalBrand.accent
                ? { color: "var(--brand-primary, #1c1917)" }
                : undefined
            }
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className={[
                  "shrink-0 rounded object-contain",
                  railMode ? "h-7 w-7" : "h-9 w-9",
                ].join(" ")}
              />
            ) : railMode ? (
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center text-xs font-semibold tracking-wide"
              >
                {initials}
              </span>
            ) : null}

            {!railMode ? (
              <span
                className={[
                  "flex min-w-0 flex-col font-semibold tracking-[0.16em] uppercase",
                  logoSrc
                    ? "h-9 justify-center gap-0.5 text-xs leading-none"
                    : "gap-0.5 text-sm leading-none",
                ].join(" ")}
              >
                {words.map((word, index) => (
                  <span key={`${word}-${index}`} className="truncate">
                    {word}
                  </span>
                ))}
              </span>
            ) : null}
          </Link>
          {!railMode ? (
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 lg:inline-flex"
              aria-label={t("collapseSidebar")}
              aria-expanded={!collapsed}
              aria-controls="app-sidebar"
              onClick={toggleCollapsed}
            >
              <CollapseIcon />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 lg:hidden"
            aria-label={t("closeMenu")}
            onClick={() => setMobileOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={groups} collapsed={railMode} />
        </div>
      </aside>
    </>
  );
}

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M12 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
