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

type Business = { id: number; name: string };

type Membership = {
  id: number;
  role: string;
  status: string;
  status_reason: string | null;
  approved_at: string | null;
  user?: { id: number; name: string; email: string };
  business?: { id: number; name: string; slug: string };
  websites?: Array<{ id: number; name: string; base_url: string }>;
  payment_methods?: Array<{
    id: number;
    status: string;
    display_mask: string;
    version: number;
    method_type: string;
  }>;
  referral_codes?: Array<{ id: number; code: string; is_active: boolean }>;
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
] as const;

export default function AdminMembershipsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (businessFilter !== "") params.set("business_id", String(businessFilter));
    const query = params.toString();
    const [list, biz] = await Promise.all([
      apiFetch<{ data: Membership[] }>(
        `/api/v1/admin/memberships${query ? `?${query}` : ""}`,
      ),
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
    ]);
    setMemberships(list.data);
    setBusinesses(biz.data);
  }, [statusFilter, businessFilter]);

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

  function openSuspendDrawer(id: number) {
    openDrawer({
      id: `suspend-membership-${id}`,
      title: `Suspender membership #${id}`,
      description: "Códigos de referral ativos serão desativados.",
      content: (
        <PromptForm
          label="Motivo da suspensão"
          submitLabel="Suspender"
          onCancel={closeDrawer}
          onSubmit={async (reason) => {
            await apiFetch(`/api/v1/admin/memberships/${id}/suspend`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setMessage(`Membership #${id} suspensa.`);
            setError(null);
            closeDrawer();
            await load();
          }}
        />
      ),
    });
  }

  function openDetailDrawer(membership: Membership) {
    openDrawer({
      id: `membership-detail-${membership.id}`,
      title: membership.user?.name ?? `Membership #${membership.id}`,
      description: membership.user?.email ?? "Detalhe da membership",
      content: (
        <div className="space-y-4 text-sm">
          <dl className="space-y-2">
            <div>
              <dt className="text-stone-500">Business</dt>
              <dd className="font-medium text-stone-900">
                {membership.business?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Role / estado</dt>
              <dd className="font-medium text-stone-900">
                {membership.role} · {membership.status}
              </dd>
            </div>
            {membership.status_reason ? (
              <div>
                <dt className="text-stone-500">Motivo</dt>
                <dd>{membership.status_reason}</dd>
              </div>
            ) : null}
            {membership.approved_at ? (
              <div>
                <dt className="text-stone-500">Aprovado em</dt>
                <dd>
                  {new Date(membership.approved_at).toLocaleString("pt-PT")}
                </dd>
              </div>
            ) : null}
          </dl>

          <div>
            <p className="mb-1 font-medium text-stone-900">Websites</p>
            {(membership.websites?.length ?? 0) === 0 ? (
              <p className="text-stone-500">Nenhum website atribuído.</p>
            ) : (
              <ul className="list-inside list-disc text-stone-600">
                {membership.websites?.map((w) => (
                  <li key={w.id}>
                    {w.name} ({w.base_url})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 font-medium text-stone-900">Métodos de pagamento</p>
            {(membership.payment_methods?.length ?? 0) === 0 ? (
              <p className="text-stone-500">Nenhum método.</p>
            ) : (
              <ul className="space-y-1 text-stone-600">
                {membership.payment_methods?.map((p) => (
                  <li key={p.id}>
                    v{p.version} · {p.method_type} · {p.status} ·{" "}
                    <span className="font-mono">{p.display_mask}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 font-medium text-stone-900">Códigos referral</p>
            {(membership.referral_codes?.length ?? 0) === 0 ? (
              <p className="text-stone-500">Nenhum código.</p>
            ) : (
              <ul className="space-y-1 text-stone-600">
                {membership.referral_codes?.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono">{c.code}</span> ·{" "}
                    {c.is_active ? "ativo" : "inativo"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="min-h-11 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={closeDrawer}
          >
            Fechar
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revisão de memberships"
        description="A aprovação exige um método de pagamento já aprovado e gera códigos de referral."
        helpKey="admin.memberships"
      />

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Estado
          <select
            className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Business
          <select
            className="min-h-11 rounded-md border border-stone-300 px-3 py-2"
            value={businessFilter}
            onChange={(e) =>
              setBusinessFilter(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Todos</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

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
          {memberships.map((membership) => {
            const memberLabel =
              membership.user?.name ??
              membership.user?.email ??
              `Membership #${membership.id}`;
            const websiteNames =
              membership.websites?.map((w) => w.name).join(", ") || "sem websites";

            return (
              <li key={membership.id} className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-left font-medium text-stone-900 underline-offset-2 hover:underline"
                        onClick={() => openDetailDrawer(membership)}
                      >
                        {memberLabel}
                      </button>
                      <StatusBadge tone={toneForStatus(membership.status)}>
                        {membership.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-stone-500">
                      {membership.user?.email ?? "sem email"} ·{" "}
                      {membership.business?.name ?? "—"} · {membership.role} ·{" "}
                      {websiteNames}
                    </p>
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
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => openDetailDrawer(membership)}
                    >
                      Detalhe
                    </button>
                    {membership.status === "pending" ? (
                      <>
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
                      </>
                    ) : null}
                    {membership.status === "approved" ? (
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                        onClick={() => openSuspendDrawer(membership.id)}
                      >
                        Suspender
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
