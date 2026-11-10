"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type PayoutRequest = {
  id: number;
  business_id: number;
  amount_minor: number;
  currency: string;
  status: string;
  status_reason: string | null;
  external_reference: string | null;
  business?: { id: number; name: string; payout_threshold_minor: number };
  payment_method?: {
    id: number;
    method_type: string;
    display_mask: string;
  };
  documents?: Array<{
    uuid: string;
    original_filename: string;
    scan_status: string;
  }>;
};

export default function AdminPayoutRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await apiFetch<{ data: PayoutRequest[] }>(
      "/api/v1/admin/payout-requests",
    );
    setItems(response.data);
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
      await apiFetch(`/api/v1/admin/payout-requests/${id}/approve`, {
        method: "POST",
      });
      setMessage(`Pedido #${id} aprovado.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao aprovar.");
    }
  }

  async function reject(id: number) {
    setError(null);
    setMessage(null);
    const reason = window.prompt("Motivo da rejeição:");
    if (!reason) return;
    try {
      await apiFetch(`/api/v1/admin/payout-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setMessage(`Pedido #${id} rejeitado.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao rejeitar.");
    }
  }

  async function markPaid(id: number) {
    setError(null);
    setMessage(null);
    const externalReference = window.prompt(
      "Referência externa do pagamento (ex. SEPA):",
    );
    if (!externalReference) return;
    try {
      await apiFetch(`/api/v1/admin/payout-requests/${id}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ external_reference: externalReference }),
      });
      setMessage(`Pedido #${id} marcado como pago (ledger settlement).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao marcar pago.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/payout-requests
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Pedidos de payout
        </h1>
        <p className="text-stone-600">
          Aprovar, rejeitar ou marcar como pago após transferência externa. O
          settlement só grava ledger — a plataforma não move dinheiro.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  #{item.id} · {item.amount_minor} {item.currency} ·{" "}
                  {item.status}
                </p>
                <p className="text-sm text-stone-600">
                  {item.business?.name ?? `business #${item.business_id}`}
                  {item.payment_method
                    ? ` · ${item.payment_method.method_type} ${item.payment_method.display_mask}`
                    : null}
                </p>
                {item.status_reason ? (
                  <p className="text-sm text-stone-500">{item.status_reason}</p>
                ) : null}
                {item.external_reference ? (
                  <p className="font-mono text-xs text-stone-500">
                    {item.external_reference}
                  </p>
                ) : null}
                {(item.documents ?? []).length > 0 ? (
                  <p className="text-xs text-stone-500">
                    Docs:{" "}
                    {(item.documents ?? [])
                      .map((d) => d.original_filename)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {item.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                      onClick={() => approve(item.id)}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                      onClick={() => reject(item.id)}
                    >
                      Rejeitar
                    </button>
                  </>
                ) : null}
                {item.status === "approved" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                      onClick={() => markPaid(item.id)}
                    >
                      Marcar pago
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                      onClick={() => reject(item.id)}
                    >
                      Rejeitar
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-8 text-sm text-stone-500">Sem pedidos.</li>
        ) : null}
      </ul>

      <Link
        href="/admin"
        className="text-sm text-stone-600 underline-offset-2 hover:underline"
      >
        ← Admin
      </Link>
    </main>
  );
}
