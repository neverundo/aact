"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/AuthShell";
import { verifyMfa } from "@/lib/auth";

type Challenge = {
  challenge_token: string;
  methods: string[];
  expires_at: string;
};

function readStoredChallenge(): Challenge | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem("aact.mfa_challenge");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Challenge;
  } catch {
    return null;
  }
}

export default function MfaPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [challenge] = useState<Challenge | null>(() => readStoredChallenge());
  const [method, setMethod] = useState(() => challenge?.methods[0] ?? "totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challenge) {
      router.replace("/login");
    }
  }, [challenge, router]);

  const methodLabel = useMemo(() => {
    switch (method) {
      case "email_otp":
        return t("mfaEmailOtpLabel");
      case "recovery_code":
        return t("mfaRecoveryLabel");
      default:
        return t("mfaTotpLabel");
    }
  }, [method, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyMfa({
        challenge_token: challenge.challenge_token,
        method,
        code,
      });
      sessionStorage.removeItem("aact.mfa_challenge");
      router.push(result.user.is_admin ? "/admin" : "/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mfaInvalid"));
    } finally {
      setLoading(false);
    }
  }

  if (!challenge) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-stone-600">
        {t("mfaRedirecting")}
      </main>
    );
  }

  return (
    <AuthShell title={t("mfaTitle")}>
      <p className="text-stone-600">{t("mfaDescription")}</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        {challenge.methods.length > 1 ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="method">
              {t("mfaMethod")}
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
            >
              {challenge.methods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="code">
            {methodLabel}
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete="one-time-code"
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? t("mfaVerifying") : t("mfaConfirm")}
        </button>
      </form>
    </AuthShell>
  );
}
