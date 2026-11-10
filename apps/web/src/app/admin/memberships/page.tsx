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

type Membership = {
  id: number;
  status: string;
  status_reason: string | null;
  business?: { id: number; name: string };
  payment_methods?: Array<{
    id: number;
    status: string;
    display_mask: string;
    version: number;
  }>;
  referral_codes?: Array<{ id: number; code: string; is_active: boolean }>;
};

export default function AdminMembershipsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
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

  function openRejectDrawer(id: number) {
    openDrawer({
      id: `reject-membership-${id}`,
      title: `Rejeitar membership #${id}`,
      description: "Indique o motivo. Fica registado no estado da membership.",
      content: (
        <PromptForm
          label="Motivo da rejeição"
          submitLabel="Rejeitar"
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/memberships/${id}/reject`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setMessage(`Membership #${id} rejeitada.`);
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
        title="Revisão de memberships"
        description="A aprovação exige um método de pagamento já aprovado e gera códigos de referral."
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : memberships.length === 0 && !error ? (
        <EmptyState
          title="Sem memberships"
          description="Memberships criadas via convites aparecem aqui para revisão."
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {memberships.map((membership) => (
            <li key={membership.id} className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">
                      #{membership.id} · {membership.business?.name ?? "—"}
                    </p>
                    <StatusBadge tone={toneForStatus(membership.status)}>
                      {membership.status}
                    </StatusBadge>
                  </div>
                  {membership.status_reason ? (
                    <p className="text-sm text-stone-500">
                      {membership.status_reason}
                    </p>
                  ) : null}
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
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="min-h-11 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                      onClick={() => approve(membership.id)}
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => openRejectDrawer(membership.id)}
                    >
                      Rejeitar
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
