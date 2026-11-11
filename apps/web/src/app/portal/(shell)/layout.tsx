import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PortalBrandTheme } from "@/components/shell/PortalBrandTheme";
import { portalNav } from "@/lib/nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalBrandTheme>
      <AppShell groups={portalNav} homeHref="/portal">
        {children}
      </AppShell>
    </PortalBrandTheme>
  );
}
