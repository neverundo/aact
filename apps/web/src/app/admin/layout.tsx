import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/shell/AppShell";
import { adminNav } from "@/lib/nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate area="admin">
      <AppShell groups={adminNav} homeHref="/admin">
        {children}
      </AppShell>
    </AuthGate>
  );
}
