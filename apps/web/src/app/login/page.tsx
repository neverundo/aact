"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/AuthShell";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);

      if (result.status === "mfa_required") {
        sessionStorage.setItem(
          "aact.mfa_challenge",
          JSON.stringify({
            challenge_token: result.challenge_token,
            methods: result.methods,
            expires_at: result.expires_at,
          }),
        );
        router.push("/login/mfa");
        return;
      }

      if (result.status === "mfa_setup_required") {
        router.push("/admin/security?setup=1");
        return;
      }

      router.push(result.user.is_admin ? "/admin" : "/portal");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("authFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("loginTitle")}>
      <p className="text-stone-600">{t("loginDescription")}</p>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-900"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="password">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-900"
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
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? t("authenticating") : t("continue")}
        </button>
      </form>
    </AuthShell>
  );
}
