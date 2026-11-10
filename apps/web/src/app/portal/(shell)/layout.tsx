import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { portalNav } from "@/lib/nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell groups={portalNav} homeHref="/portal">
      {children}
    </AppShell>
  );
}
