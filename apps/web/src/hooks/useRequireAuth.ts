"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchMe, type AuthUser } from "@/lib/auth";

type Options = {
  /** Redirect MFA setup-only sessions to security setup. Default true. */
  enforceMfaSetup?: boolean;
};

export function useRequireAuth(options: Options = {}) {
  const { enforceMfaSetup = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (
          enforceMfaSetup &&
          me.session.mfa_setup_only &&
          !pathname.startsWith("/admin/security")
        ) {
          router.replace("/admin/security?setup=1");
          return;
        }
        setUser(me);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : t("noAccess"));
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, enforceMfaSetup, pathname, t]);

  return { user, ready, error, setError, setUser };
}
