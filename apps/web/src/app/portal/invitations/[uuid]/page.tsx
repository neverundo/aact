"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Invitation = {
  uuid: string;
  email: string;
  name: string | null;
  business: { id: number; name: string; slug: string };
  websites: Array<{ id: number; name: string; base_url: string }>;
  expires_at: string;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

function acceptSubmitLabel(
  busy: boolean,
  mode: "register" | "accept",
): string {
  if (busy) return "A processar…";
  if (mode === "accept") return "Aceitar convite";
  return "Criar conta e aceitar";
}

function InvitationAcceptForm() {
  const params = useParams<{ uuid: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"register" | "accept">("register");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await apiFetch<{ data: Invitation }>(
          `/api/v1/invitations/${params.uuid}?token=${encodeURIComponent(token)}`,
        );
        if (cancelled) return;
        setInvitation(response.data);
        setName(response.data.name ?? "");

        try {
          const me = await fetchMe();
          if (cancelled) return;
          if (me.email.toLowerCase() === response.data.email.toLowerCase()) {
            setMode("accept");
          }
        } catch {
          if (!cancelled) setMode("register");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Convite indisponível.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.uuid, token]);

  const tokenError = token ? null : "Token de convite em falta.";
  const visibleError = tokenError ?? error;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);

    try {
      if (mode === "accept") {
        await apiFetch(`/api/v1/portal/invitations/${params.uuid}/accept`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
      } else {
        await apiFetch(`/api/v1/invitations/${params.uuid}/register`, {
          method: "POST",
          body: JSON.stringify({
            token,
            name,
            password,
            password_confirmation: passwordConfirmation,
          }),
        });
      }
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao aceitar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {visibleError ? (
        <p className="text-sm text-red-700" role="alert">
          {visibleError}
        </p>
      ) : null}

      {invitation ? (
        <section className="space-y-2 border-y border-stone-200 py-4 text-sm">
          <p>
            <span className="text-stone-500">Business:</span>{" "}
            {invitation.business.name}
          </p>
          <p>
            <span className="text-stone-500">Email:</span> {invitation.email}
          </p>
          <p>
            <span className="text-stone-500">Websites:</span>{" "}
            {invitation.websites.map((w) => w.name).join(", ")}
          </p>
          <p>
            <span className="text-stone-500">Expira:</span>{" "}
            {new Date(invitation.expires_at).toLocaleString("pt-PT")}
          </p>
        </section>
      ) : null}

      {invitation &&
      !invitation.accepted &&
      !invitation.revoked &&
      !invitation.expired ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Nome{/* */}
                <input
                  className="rounded-md border border-stone-300 px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Password{/* */}
                <input
                  type="password"
                  className="rounded-md border border-stone-300 px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Confirmar password{/* */}
                <input
                  type="password"
                  className="rounded-md border border-stone-300 px-3 py-2"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  minLength={12}
                  required
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-stone-600">
              Sessão autenticada com o email do convite. Pode aceitar agora.
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {acceptSubmitLabel(busy, mode)}
          </button>
        </form>
      ) : null}
    </>
  );
}

export default function InvitationAcceptPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
        /portal/invitations
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Aceitar convite</h1>
      <p className="text-stone-600">
        Pré-visualizar o convite não o consome. Só a submissão explícita cria a
        membership pendente.
      </p>

      <Suspense fallback={<p className="text-stone-600">A carregar convite…</p>}>
        <InvitationAcceptForm />
      </Suspense>

      <Link href="/login" className="text-sm underline-offset-2 hover:underline">
        Ir para login
      </Link>
    </main>
  );
}
