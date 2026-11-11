"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { PromptForm } from "@/components/shell/PromptForm";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type PaymentMethod = {
  id: number;
  uuid: string;
  method_type: string;
  display_mask: string;
  status: string;
  version: number;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string | null;
  user?: { id: number; name: string; email: string };
  business?: { id: number; name: string };
};

const STATUS_FILTERS = [
  { value: "pending_review", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Recusados" },
  { value: "superseded", label: "Substituídos" },
  { value: "all", label: "Todos" },
] as const;

export default function AdminPaymentMethodsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, unknown>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const response = await apiFetch<{ data: PaymentMethod[] }>(
      `/api/v1/admin/payment-methods?${params.toString()}`,
    );
    setItems(response.data);
  }, [statusFilter]);

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
  }, [router, load]);

  async function review(id: number, status: "approved" | "rejected") {
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/payment-methods/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na revisão.");
    }
  }

  function openRevealDrawer(id: number) {
    openDrawer({
      id: `reveal-pm-${id}`,
      title: "Step-up para revelar",
      description:
        "O payload completo exige reautenticação recente e fica auditado.",
      content: (
        <PromptForm
          label="Palavra-passe"
          submitLabel="Revelar"
          inputType="password"
          onCancel={closeDrawer}
          onSubmit={async (password) => {
            await apiFetch("/api/v1/auth/step-up", {
              method: "POST",
              body: JSON.stringify({ method: "password", password }),
            });
            const response = await apiFetch<{ payload: unknown }>(
              `/api/v1/admin/payment-methods/${id}/reveal`,
              { method: "POST" },
            );
            setRevealed((prev) => ({ ...prev, [id]: response.payload }));
            setError(null);
            closeDrawer();
          }}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Métodos de pagamento"
        description="Histórico versionado por membership. A UI mostra máscaras; o payload completo só após step-up."
        helpKey="admin.payment-methods"
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar por estado"
      >
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter.value
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 hover:bg-stone-100"
            }`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="Sem métodos neste filtro"
          description="Altere o filtro ou aguarde submissões do portal."
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">
                      {item.user?.name ?? item.user?.email ?? `#${item.id}`} ·{" "}
                      {item.method_type} · v{item.version}
                    </p>
                    <StatusBadge tone={toneForStatus(item.status)}>
                      {item.status}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-stone-500">
                    {item.user?.email ?? "sem email"} ·{" "}
                    {item.business?.name ?? "—"}
                  </p>
                  <p className="font-mono text-sm text-stone-600">
                    {item.display_mask}
                  </p>
                  {item.reviewed_at ? (
                    <p className="text-xs text-stone-500">
                      revisto{" "}
                      {new Date(item.reviewed_at).toLocaleString("pt-PT")}
                      {item.review_notes ? ` · ${item.review_notes}` : ""}
                    </p>
                  ) : item.created_at ? (
                    <p className="text-xs text-stone-500">
                      criado{" "}
                      {new Date(item.created_at).toLocaleString("pt-PT")}
                    </p>
                  ) : null}
                  {revealed[item.id] ? (
                    <pre className="mt-2 overflow-x-auto rounded bg-stone-100 p-2 text-xs">
                      {JSON.stringify(revealed[item.id], null, 2)}
                    </pre>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status === "pending_review" ? (
                    <>
                      <button
                        type="button"
                        className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                        onClick={() => review(item.id, "approved")}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                        onClick={() => review(item.id, "rejected")}
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                    onClick={() => openRevealDrawer(item.id)}
                  >
                    Reveal
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
