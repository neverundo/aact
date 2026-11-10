"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { NavGroup } from "@/lib/nav";
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

export function Sidebar({
  groups,
  homeHref,
}: {
  groups: NavGroup[];
  homeHref: string;
}) {
  const { collapsed, mobileOpen, setMobileOpen, toggleCollapsed } = useShell();
  const isLg = useSyncExternalStore(
    subscribeIsLg,
    getIsLgSnapshot,
    getIsLgServerSnapshot,
  );
  const railMode = collapsed && isLg;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label="Navegação lateral"
        data-collapsed={railMode ? "true" : "false"}
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-stone-200 bg-white transition-[width,transform] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          railMode ? "lg:w-16" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-14 shrink-0 items-center border-b border-stone-200 px-3",
            railMode ? "justify-center lg:px-2" : "justify-between",
          ].join(" ")}
        >
          <Link
            href={homeHref}
            className="text-sm font-semibold tracking-[0.18em] text-stone-900 uppercase pl-3"
            onClick={() => setMobileOpen(false)}
            aria-label="AACT"
          >
            <span className={railMode ? "lg:hidden" : undefined}>AACT</span>
            <span
              className={railMode ? "hidden lg:inline" : "hidden"}
              aria-hidden="true"
            >
              A
            </span>
          </Link>
          <button
            type="button"
            className="hidden min-h-11 min-w-11 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 lg:inline-flex"
            aria-label={
              collapsed ? "Expandir barra lateral" : "Fechar barra lateral"
            }
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            onClick={toggleCollapsed}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 lg:hidden"
            aria-label="Fechar menu"
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

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d={collapsed ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"}
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
