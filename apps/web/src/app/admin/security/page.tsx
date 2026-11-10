"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe, type AuthUser } from "@/lib/auth";

type TotpBegin = {
  secret: string;
  otpauth_url: string;
  qr_svg: string;
};

export default function AdminSecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [setup, setSetup] = useState<TotpBegin | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => router.replace("/login"));
  }, [router]);

  async function beginTotp() {
    setError(null);
    try {
      const result = await apiFetch<TotpBegin>("/api/v1/auth/mfa/totp/begin", {
        method: "POST",
      });
      setSetup(result);
      setMessage("Confirme um código da app antes de o TOTP ficar ativo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar TOTP.");
    }
  }

  async function confirmTotp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await apiFetch<{
        status: string;
        recovery_codes: string[];
      }>("/api/v1/auth/mfa/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setRecoveryCodes(result.recovery_codes);
      setSetup(null);
      setMessage("TOTP ativado. Guarde os códigos de recuperação agora.");
      setUser(await fetchMe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    }
  }

  if (!user) {
    return <p className="text-stone-600">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Segurança da conta"
        description={
          user.session.mfa_setup_only
            ? "Acesso administrativo bloqueado até configurar TOTP."
            : "Gerir MFA, sessões e reautenticação."
        }
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Estado</h2>
        <ul className="space-y-2 text-sm text-stone-700">
          <li>Email: {user.email}</li>
          <li className="flex flex-wrap items-center gap-2">
            TOTP:{" "}
            <StatusBadge tone={user.mfa.totp_enabled ? "success" : "warning"}>
              {user.mfa.totp_enabled ? "ativo" : "inativo"}
            </StatusBadge>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            Email OTP:{" "}
            <StatusBadge
              tone={user.mfa.email_otp_enabled ? "success" : "neutral"}
            >
              {user.mfa.email_otp_enabled ? "ativo" : "inativo"}
            </StatusBadge>
            <span className="text-stone-500">
              (garantia inferior ao TOTP)
            </span>
          </li>
          <li>
            Códigos de recuperação restantes:{" "}
            {user.mfa.recovery_codes_remaining}
          </li>
        </ul>
      </section>

      {!user.mfa.totp_enabled ? (
        <section className="space-y-4">
          <button
            type="button"
            onClick={beginTotp}
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Configurar autenticador (TOTP)
          </button>

          {setup ? (
            <div className="space-y-4 rounded-md border border-stone-200 p-4">
              <div
                className="max-w-xs overflow-hidden bg-white p-2"
                dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
              />
              <p className="break-all text-xs text-stone-500">
                Segredo (apenas durante o setup): {setup.secret}
              </p>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={confirmTotp}
              >
                <div className="space-y-1">
                  <label className="block text-sm font-medium" htmlFor="totp">
                    Código de confirmação
                  </label>
                  <input
                    id="totp"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="rounded-md border border-stone-300 px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                >
                  Confirmar e ativar
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {recoveryCodes ? (
        <section className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-950">
            Códigos de recuperação (mostrados uma vez)
          </h2>
          <ul className="grid gap-1 font-mono text-sm text-amber-950 sm:grid-cols-2">
            {recoveryCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
