"use client";

import type { ReactNode } from "react";
import type { NavGroup } from "@/lib/nav";
import { AppHeader } from "./AppHeader";
import type { AppShellBrand } from "./brand";
import { ContextDrawer } from "./ContextDrawer";
import { ShellProvider } from "./ShellProvider";
import { Sidebar } from "./Sidebar";

export type { AppShellBrand };

export function AppShell({
  groups,
  homeHref,
  brand,
  children,
}: {
  groups: NavGroup[];
  homeHref: string;
  brand?: AppShellBrand;
  children: ReactNode;
}) {
  return (
    <ShellProvider>
      <div className="flex h-dvh overflow-hidden bg-stone-50">
        <Sidebar groups={groups} homeHref={homeHref} brand={brand} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <AppHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
      <ContextDrawer />
    </ShellProvider>
  );
}
