"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = { id: number; name: string };
type Website = { id: number; name: string; business_id: number };
type Rule = {
  id: number;
  name: string;
  event_type: string;
  rate_bps: number;
  flat_minor: number;
  priority: number;
  version: number;
  is_active: boolean;
  business_id: number;
  website_id: number | null;
  business?: { id: number; name: string };
  website?: { id: number; name: string } | null;
};

export default function AdminCommissionRulesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">A carregar…</p>}>
      <AdminCommissionRulesInner />
    </Suspense>
  );
}

function AdminCommissionRulesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer, closeDrawer } = useShell();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const prefillBusinessId = searchParams.get("business_id");
  const prefillWebsiteId = searchParams.get("website_id");

  async function load() {
    const [biz, sites, list] = await Promise.all([
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
      apiFetch<{ data: Website[] }>("/api/v1/admin/websites"),
      apiFetch<{ data: Rule[] }>("/api/v1/admin/commission-rules"),
    ]);
    setBusinesses(biz.data);
    setWebsites(sites.data);
    setRules(list.data);
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
        if (prefillBusinessId) {
          openCreateDrawer(
            Number(prefillBusinessId),
            prefillWebsiteId ? Number(prefillWebsiteId) : undefined,
          );
        }
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Sem acesso.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openCreateDrawer(businessId?: number, websiteId?: number) {
    openDrawer({
      id: "create-rule",
      title: "Criar regra",
      description: "Valores em basis points (1000 = 10%).",
      content: (
        <CreateRuleForm
          businesses={businesses}
          websites={websites}
          initialBusinessId={businessId}
          initialWebsiteId={websiteId}
          onSuccess={async () => {
            setMessage("Regra criada.");
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  async function deactivate(id: number) {
    if (!window.confirm("Desativar esta regra?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/commission-rules/${id}/deactivate`, {
        method: "POST",
      });
      setMessage("Regra desativada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao desativar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Regras de comissão"
        description="Valores em basis points (1000 = 10%). Precedência por prioridade e versão. O âmbito define website ou todo o business."
        helpKey="admin.commission-rules"
        actions={
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={() => openCreateDrawer()}
          >
            Criar regra
          </button>
        }
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : rules.length === 0 && !error ? (
        <EmptyState
          title="Sem regras"
          description="Defina a primeira regra de comissão para o business."
          action={
            <button
              type="button"
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={() => openCreateDrawer()}
            >
              Criar regra
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
          {rules.map((rule) => {
            const scope = rule.website?.name
              ? `website: ${rule.website.name}`
              : "todo o business";
            return (
              <li key={rule.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">
                        {rule.name} · v{rule.version}
                      </p>
                      <StatusBadge tone={rule.is_active ? "success" : "danger"}>
                        {rule.is_active ? "ativa" : "inativa"}
                      </StatusBadge>
                    </div>
                    <p className="text-stone-500">
                      {rule.business?.name ?? `business #${rule.business_id}`} ·{" "}
                      {scope}
                    </p>
                    <p className="text-stone-500">
                      {rule.event_type} · {rule.rate_bps} bps
                      {rule.flat_minor
                        ? ` + ${rule.flat_minor} flat`
                        : ""}{" "}
                      · prio {rule.priority}
                    </p>
                  </div>
                  {rule.is_active ? (
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => deactivate(rule.id)}
                    >
                      Desativar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreateRuleForm({
  businesses,
  websites,
  initialBusinessId,
  initialWebsiteId,
  onSuccess,
  onError,
}: {
  businesses: Business[];
  websites: Website[];
  initialBusinessId?: number;
  initialWebsiteId?: number;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [businessId, setBusinessId] = useState<number | "">(
    initialBusinessId ?? "",
  );
  const [websiteId, setWebsiteId] = useState<number | "">(
    initialWebsiteId ?? "",
  );
  const [name, setName] = useState("Default sale");
  const [rateBps, setRateBps] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedWebsite =
    websiteId === ""
      ? null
      : websites.find((w) => w.id === websiteId) ?? null;
  const selectedBusiness =
    businessId === ""
      ? null
      : businesses.find((b) => b.id === businessId) ?? null;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/admin/commission-rules", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          website_id: websiteId || null,
          name,
          event_type: "sale",
          rate_bps: rateBps,
          flat_minor: 0,
          priority: 100,
          effective_from: new Date().toISOString(),
        }),
      });
      await onSuccess();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao criar regra.";
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onCreate}>
      <label className="flex flex-col gap-1 text-sm">
        Business
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={businessId}
          onChange={(e) => {
            setBusinessId(e.target.value ? Number(e.target.value) : "");
            setWebsiteId("");
          }}
          required
        >
          <option value="">Selecionar…</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Website (opcional)
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={websiteId}
          onChange={(e) =>
            setWebsiteId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Todos do business</option>
          {websites
            .filter((w) => businessId === "" || w.business_id === businessId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      </label>
      {selectedBusiness ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600">
          Será aplicada em{" "}
          {selectedWebsite
            ? `website “${selectedWebsite.name}”`
            : `todo o business “${selectedBusiness.name}”`}
          .
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Taxa (bps)
        <input
          type="number"
          min={0}
          max={10000}
          className="rounded-md border border-stone-300 px-3 py-2"
          value={rateBps}
          onChange={(e) => setRateBps(Number(e.target.value))}
          required
        />
      </label>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {loading ? "A criar…" : "Criar regra"}
      </button>
    </form>
  );
}
