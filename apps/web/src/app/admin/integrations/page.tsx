"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = { id: number; name: string };
type Website = { id: number; name: string; business_id: number };
type Credential = {
  id: number;
  source: string;
  name: string;
  website_id: number;
  revoked_at: string | null;
  last_used_at: string | null;
};

export default function AdminIntegrationsPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [items, setItems] = useState<Credential[]>([]);
  const [secrets, setSecrets] = useState<{ token: string; hmac: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [biz, sites, creds] = await Promise.all([
      apiFetch<{ data: Business[] }>("/api/v1/admin/businesses"),
      apiFetch<{ data: Website[] }>("/api/v1/admin/websites"),
      apiFetch<{ data: Credential[] }>("/api/v1/admin/integrations"),
    ]);
    setBusinesses(biz.data);
    setWebsites(sites.data);
    setItems(creds.data);
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
        if (status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "Sem acesso.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function openCreateDrawer() {
    openDrawer({
      id: "create-integration",
      title: "Criar credencial",
      description:
        "Segredos bearer + HMAC só aparecem na criação. Guarde-os de imediato.",
      content: (
        <CreateIntegrationForm
          businesses={businesses}
          websites={websites}
          onSuccess={async (nextSecrets) => {
            setSecrets(nextSecrets);
            setError(null);
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrações"
        description="Credenciais bearer + HMAC por business/website/source."
        actions={
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={openCreateDrawer}
          >
            Criar credencial
          </button>
        }
      />

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {secrets ? (
        <pre className="overflow-x-auto rounded-md bg-stone-100 p-3 text-xs">
          {JSON.stringify(secrets, null, 2)}
        </pre>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">A carregar…</p>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="Sem integrações"
          description="Crie uma credencial para ingestão HMAC."
          action={
            <button
              type="button"
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={openCreateDrawer}
            >
              Criar credencial
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-stone-900">
                  {item.name} · {item.source}
                </p>
                <StatusBadge tone={item.revoked_at ? "danger" : "success"}>
                  {item.revoked_at ? "revogada" : "ativa"}
                </StatusBadge>
              </div>
              <p className="text-stone-500">
                {item.last_used_at
                  ? `último uso ${new Date(item.last_used_at).toLocaleString("pt-PT")}`
                  : "ainda sem uso"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateIntegrationForm({
  businesses,
  websites,
  onSuccess,
  onError,
}: {
  businesses: Business[];
  websites: Website[];
  onSuccess: (secrets: { token: string; hmac: string }) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [businessId, setBusinessId] = useState<number | "">("");
  const [websiteId, setWebsiteId] = useState<number | "">("");
  const [source, setSource] = useState("node_checkout");
  const [name, setName] = useState("Checkout");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      const response = await apiFetch<{
        token: string;
        hmac_secret: string;
      }>("/api/v1/admin/integrations", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          website_id: websiteId,
          source,
          name,
        }),
      });
      await onSuccess({ token: response.token, hmac: response.hmac_secret });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao criar.";
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
        Website
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={websiteId}
          onChange={(e) =>
            setWebsiteId(e.target.value ? Number(e.target.value) : "")
          }
          required
        >
          <option value="">Selecionar…</option>
          {websites
            .filter((w) => businessId === "" || w.business_id === businessId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Source
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        {loading ? "A criar…" : "Criar credencial"}
      </button>
    </form>
  );
}
