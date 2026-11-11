"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useShell } from "@/components/shell/ShellProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForStatus } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Website = {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
};

type Business = {
  id: number;
  name: string;
  slug: string;
  currency: string;
  payout_threshold_minor: number;
  is_active: boolean;
  websites?: Website[];
};

export default function AdminBusinessesPage() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useShell();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await apiFetch<{ data: Business[] }>(
      "/api/v1/admin/businesses",
    );
    setBusinesses(response.data);
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

  function openCreateDrawer() {
    openDrawer({
      id: "create-business",
      title: "Criar business",
      description: "Crie o business e depois adicione websites no detalhe.",
      content: (
        <CreateBusinessForm
          onSuccess={async (business) => {
            setMessage(`Business “${business.name}” criado.`);
            setError(null);
            closeDrawer();
            await load();
            router.push(`/admin/businesses/${business.id}`);
          }}
          onError={setError}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Businesses"
        description="Gestão de businesses e websites. A autorização efetiva está no Laravel."
        helpKey="admin.businesses"
        actions={
          <button
            type="button"
            className="min-h-11 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            onClick={openCreateDrawer}
          >
            Criar business
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
      ) : businesses.length === 0 && !error ? (
        <EmptyState
          title="Sem businesses"
          description="Crie o primeiro business para começar onboarding e integrações."
          action={
            <button
              type="button"
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
              onClick={openCreateDrawer}
            >
              Criar business
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {businesses.map((business) => (
            <li
              key={business.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/admin/businesses/${business.id}`}
                  className="font-medium text-stone-900 underline-offset-2 hover:underline"
                >
                  {business.name}
                </Link>
                <p className="text-sm text-stone-500">
                  {business.slug} · {business.currency} ·{" "}
                  {business.websites?.length ?? 0} website
                  {(business.websites?.length ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={toneForStatus(business.is_active ? "ativo" : "inativo")}
                >
                  {business.is_active ? "ativo" : "inativo"}
                </StatusBadge>
                <Link
                  href={`/admin/businesses/${business.id}`}
                  className="min-h-11 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                >
                  Gerir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateBusinessForm({
  onSuccess,
  onError,
}: {
  onSuccess: (business: Business) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [threshold, setThreshold] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      const response = await apiFetch<{ data: Business }>(
        "/api/v1/admin/businesses",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            slug: slug || undefined,
            currency,
            payout_threshold_minor: threshold,
            is_active: true,
          }),
        },
      );
      await onSuccess(response.data);
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
        Nome
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Slug (opcional)
        <input
          className="rounded-md border border-stone-300 px-3 py-2"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="gerado a partir do nome"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Moeda
        <input
          className="rounded-md border border-stone-300 px-3 py-2 uppercase"
          value={currency}
          maxLength={3}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Limiar de payout (minor units)
        <input
          type="number"
          min={0}
          className="rounded-md border border-stone-300 px-3 py-2"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
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
        {loading ? "A criar…" : "Criar business"}
      </button>
    </form>
  );
}
