import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { adminNav } from "@/lib/nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell groups={adminNav} homeHref="/admin">
      {children}
    </AppShell>
  );
}
