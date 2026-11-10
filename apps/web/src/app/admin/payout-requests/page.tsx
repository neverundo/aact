"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
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
  const { openDrawer, closeDrawer } = useShell();
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
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

  function openRejectDrawer(id: number) {
    openDrawer({
      id: `reject-payout-${id}`,
      title: `Rejeitar pedido #${id}`,
      content: (
        <PromptForm
          label="Motivo da rejeição"
          submitLabel="Rejeitar"
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/payout-requests/${id}/reject`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setMessage(`Pedido #${id} rejeitado.`);
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  function openMarkPaidDrawer(id: number) {
    openDrawer({
      id: `mark-paid-${id}`,
      title: `Marcar pedido #${id} como pago`,
      description:
        "Settlement só grava ledger — a plataforma não move dinheiro.",
      content: (
        <PromptForm
          label="Referência externa (ex. SEPA)"
          submitLabel="Marcar pago"
          placeholder="SEPA-…"
          onCancel={closeDrawer}
          onSubmit={async (externalReference) => {
            await apiFetch(`/api/v1/admin/payout-requests/${id}/mark-paid`, {
              method: "POST",
              body: JSON.stringify({ external_reference: externalReference }),
            });
            setMessage(`Pedido #${id} marcado como pago (ledger settlement).`);
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos de payout"
        description="Aprovar, rejeitar ou marcar como pago após transferência externa."
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="Sem pedidos"
          description="Pedidos submetidos pelo portal do referrer aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">
                      #{item.id} · {item.amount_minor} {item.currency}
                    </p>
                    <StatusBadge tone={toneForStatus(item.status)}>
                      {item.status}
                    </StatusBadge>
                  </div>
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
                        className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                        onClick={() => approve(item.id)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                        onClick={() => openRejectDrawer(item.id)}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  {item.status === "approved" ? (
                    <>
                      <button
                        type="button"
                        className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                        onClick={() => openMarkPaidDrawer(item.id)}
                      >
                        Marcar pago
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                        onClick={() => openRejectDrawer(item.id)}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
