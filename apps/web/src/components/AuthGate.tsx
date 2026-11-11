"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Area = "admin" | "portal";

/**
 * Blocks protected chrome (sidebar/header) until a session is confirmed.
 * Unauthenticated visitors are redirected to /login and never see the shell.
 */
export function AuthGate({
  area,
  children,
}: {
  area: Area;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const { user, ready } = useRequireAuth({
    enforceMfaSetup: area === "admin",
  });

  if (!ready || !user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-stone-600">
        {t("loading")}
      </main>
    );
  }

  return children;
}
