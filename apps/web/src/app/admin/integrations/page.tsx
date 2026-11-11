"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  business_id: number;
  revoked_at: string | null;
  last_used_at: string | null;
  business?: { id: number; name: string };
  website?: { id: number; name: string };
};

const SOURCE_PRESETS = [
  { value: "node_checkout", label: "node_checkout (ecommerce / Node)" },
  { value: "demo_checkout", label: "demo_checkout (seed local)" },
  { value: "offline_pos", label: "offline_pos (POS / till)" },
  { value: "__custom", label: "Outro…" },
] as const;

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">A carregar…</p>}>
      <AdminIntegrationsInner />
    </Suspense>
  );
}

function AdminIntegrationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer, closeDrawer } = useShell();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [items, setItems] = useState<Credential[]>([]);
  const [secrets, setSecrets] = useState<{ token: string; hmac: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const prefillBusinessId = searchParams.get("business_id");
  const prefillWebsiteId = searchParams.get("website_id");

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
        if (prefillBusinessId && prefillWebsiteId) {
          openCreateDrawer(
            Number(prefillBusinessId),
            Number(prefillWebsiteId),
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
    // Intentionally run once on mount for prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openCreateDrawer(businessId?: number, websiteId?: number) {
    openDrawer({
      id: "create-integration",
      title: "Criar credencial",
      description:
        "Segredos bearer + HMAC só aparecem na criação. Guarde-os de imediato.",
      content: (
        <CreateIntegrationForm
          businesses={businesses}
          websites={websites}
          initialBusinessId={businessId}
          initialWebsiteId={websiteId}
          onSuccess={async (nextSecrets) => {
            setSecrets(nextSecrets);
            setError(null);
            setMessage("Credencial criada. Guarde os segredos abaixo.");
            closeDrawer();
            await load();
          }}
          onError={setError}
        />
      ),
    });
  }

  async function rotate(id: number) {
    setError(null);
    try {
      const response = await apiFetch<{
        token: string;
        hmac_secret: string;
      }>(`/api/v1/admin/integrations/${id}/rotate`, { method: "POST" });
      setSecrets({ token: response.token, hmac: response.hmac_secret });
      setMessage("Credencial rodada. Guarde os novos segredos.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao rodar.");
    }
  }

  async function revoke(id: number) {
    if (!window.confirm("Revogar esta credencial? Deixa de autenticar eventos.")) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/integrations/${id}/revoke`, {
        method: "POST",
      });
      setMessage("Credencial revogada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao revogar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrações"
        description="Credenciais bearer + HMAC por business/website/source para POST /api/v1/integration/events."
        helpKey="admin.integrations"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={() => setShowGuide((v) => !v)}
            >
              {showGuide ? "Ocultar guia" : "Como integrar"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              onClick={() => openCreateDrawer()}
            >
              Criar credencial
            </button>
          </div>
        }
      />

      {showGuide ? <IntegrationGuide /> : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
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
          description="Crie uma credencial para ingestão HMAC a partir do checkout externo."
          action={
            <button
              type="button"
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={() => openCreateDrawer()}
            >
              Criar credencial
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">
                      {item.name} · {item.source}
                    </p>
                    <StatusBadge tone={item.revoked_at ? "danger" : "success"}>
                      {item.revoked_at ? "revogada" : "ativa"}
                    </StatusBadge>
                  </div>
                  <p className="text-stone-500">
                    {item.business?.name ?? `business #${item.business_id}`} ·{" "}
                    {item.website?.name ?? `website #${item.website_id}`}
                  </p>
                  <p className="text-stone-500">
                    {item.last_used_at
                      ? `último uso ${new Date(item.last_used_at).toLocaleString("pt-PT")}`
                      : "ainda sem uso"}
                  </p>
                </div>
                {!item.revoked_at ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => rotate(item.id)}
                    >
                      Rodar
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                      onClick={() => revoke(item.id)}
                    >
                      Revogar
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

function IntegrationGuide() {
  return (
    <section
      className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
      aria-labelledby="integration-guide-heading"
    >
      <h2 id="integration-guide-heading" className="font-semibold text-stone-900">
        Como integrar um checkout externo
      </h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Crie uma credencial ligada ao website certo. O campo{" "}
          <strong>source</strong> é um identificador estável do canal (ex.:{" "}
          <code>node_checkout</code>) — não é um runtime especial. É usado na
          unicidade da credencial e na idempotência dos eventos.
        </li>
        <li>
          Guarde <code>token</code> e <code>hmac_secret</code> (mostrados uma
          só vez).
        </li>
        <li>
          No checkout, preserve o <code>?ref=CODE</code> da visita e envie{" "}
          <code>referral_code</code> no evento <code>sale</code>.
        </li>
        <li>
          Faça <code>POST /api/v1/integration/events</code> com headers{" "}
          <code>Authorization: Bearer …</code>, <code>X-AACT-Timestamp</code>,{" "}
          <code>X-AACT-Nonce</code> e <code>X-AACT-Signature</code> (HMAC sobre{" "}
          <code>timestamp.nonce.rawBody</code>).
        </li>
      </ol>
      <p>
        Exemplo pronto:{" "}
        <code>examples/node-checkout/post-sale.mjs</code>. Documentação:{" "}
        <code>docs/integrations/checkout.md</code>.
      </p>
    </section>
  );
}

function CreateIntegrationForm({
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
  onSuccess: (secrets: { token: string; hmac: string }) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [businessId, setBusinessId] = useState<number | "">(
    initialBusinessId ?? "",
  );
  const [websiteId, setWebsiteId] = useState<number | "">(
    initialWebsiteId ?? "",
  );
  const [sourcePreset, setSourcePreset] = useState<string>("node_checkout");
  const [customSource, setCustomSource] = useState("");
  const [name, setName] = useState("Checkout");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const source = useMemo(
    () => (sourcePreset === "__custom" ? customSource : sourcePreset),
    [sourcePreset, customSource],
  );

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
        <select
          className="rounded-md border border-stone-300 px-3 py-2"
          value={sourcePreset}
          onChange={(e) => setSourcePreset(e.target.value)}
        >
          {SOURCE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {sourcePreset === "__custom" ? (
        <label className="flex flex-col gap-1 text-sm">
          Source personalizado
          <input
            className="rounded-md border border-stone-300 px-3 py-2"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            placeholder="ex.: shopify_webhook"
            required
          />
        </label>
      ) : null}
      <p className="text-xs text-stone-500">
        Source identifica o canal de origem. Deve ser único por business e entra
        na chave de idempotência dos eventos.
      </p>
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
