import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/shell/AppShell";
import { PortalBrandTheme } from "@/components/shell/PortalBrandTheme";
import { portalNav } from "@/lib/nav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate area="portal">
      <PortalBrandTheme>
        <AppShell groups={portalNav} homeHref="/portal">
          {children}
        </AppShell>
      </PortalBrandTheme>
    </AuthGate>
  );
}
