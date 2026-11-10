"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, type AuthUser } from "@/lib/auth";

type Options = {
  /** Redirect MFA setup-only sessions to security setup. Default true. */
  enforceMfaSetup?: boolean;
};

export function useRequireAuth(options: Options = {}) {
  const { enforceMfaSetup = true } = options;
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (enforceMfaSetup && me.session.mfa_setup_only) {
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
        setError(err instanceof Error ? err.message : "Sem acesso.");
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, enforceMfaSetup]);

  return { user, ready, error, setError, setUser };
}
