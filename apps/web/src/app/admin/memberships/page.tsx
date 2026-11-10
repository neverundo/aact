"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Membership = {
  id: number;
  status: string;
  status_reason: string | null;
  business?: { id: number; name: string };
  payment_methods?: Array<{ id: number; status: string; display_mask: string; version: number }>;
  referral_codes?: Array<{ id: number; code: string; is_active: boolean }>;
};

export default function AdminMembershipsPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await apiFetch<{ data: Membership[] }>(
      "/api/v1/admin/memberships",
    );
    setMemberships(response.data);
  }

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        await load();
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Sem acesso.");
      }
    })();
  }, [router]);

  async function approve(id: number) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/v1/admin/memberships/${id}/approve`, {
        method: "POST",
      });
      setMessage(`Membership #${id} aprovada.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na aprovação.");
    }
  }

  async function reject(id: number) {
    const reason = window.prompt("Motivo da rejeição?");
    if (!reason) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/memberships/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na rejeição.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/memberships
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Revisão de memberships
        </h1>
        <p className="text-stone-600">
          A aprovação exige um método de pagamento já aprovado e gera códigos de
          referral.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {memberships.map((membership) => (
          <li key={membership.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  #{membership.id} · {membership.business?.name ?? "—"}
                </p>
                <p className="text-sm text-stone-500">
                  estado: {membership.status}
                  {membership.status_reason
                    ? ` · ${membership.status_reason}`
                    : ""}
                </p>
                <p className="text-sm text-stone-500">
                  pagamentos:{" "}
                  {(membership.payment_methods ?? [])
                    .map((p) => `v${p.version}:${p.status}`)
                    .join(", ") || "nenhum"}
                </p>
                {(membership.referral_codes?.length ?? 0) > 0 ? (
                  <p className="text-sm text-stone-500">
                    códigos:{" "}
                    {membership.referral_codes?.map((c) => c.code).join(", ")}
                  </p>
                ) : null}
              </div>
              {membership.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    onClick={() => approve(membership.id)}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                    onClick={() => reject(membership.id)}
                  >
                    Rejeitar
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
        {memberships.length === 0 ? (
          <li className="py-6 text-sm text-stone-500">Sem memberships.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
