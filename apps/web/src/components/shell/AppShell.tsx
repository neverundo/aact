"use client";

import type { ReactNode } from "react";
import type { NavGroup } from "@/lib/nav";
import { AppHeader } from "./AppHeader";
import { ContextDrawer } from "./ContextDrawer";
import { ShellProvider } from "./ShellProvider";
import { Sidebar } from "./Sidebar";

export function AppShell({
  groups,
  homeHref,
  children,
}: {
  groups: NavGroup[];
  homeHref: string;
  children: ReactNode;
}) {
  return (
    <ShellProvider>
      <div className="flex min-h-full bg-stone-50">
        <Sidebar groups={groups} homeHref={homeHref} />
        <div className="flex min-w-0 flex-1 flex-col">
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
