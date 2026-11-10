"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [items, setItems] = useState<Credential[]>([]);
  const [businessId, setBusinessId] = useState<number | "">("");
  const [websiteId, setWebsiteId] = useState<number | "">("");
  const [source, setSource] = useState("node_checkout");
  const [name, setName] = useState("Checkout");
  const [secrets, setSecrets] = useState<{ token: string; hmac: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

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
    (async () => {
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
      }
    })();
  }, [router]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSecrets(null);
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
      setSecrets({ token: response.token, hmac: response.hmac_secret });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/integrations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-stone-600">
          Credenciais bearer + HMAC por business/website/source. Segredos só
          aparecem na criação/rotação.
        </p>
      </div>

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
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Criar credencial
        </button>
      </form>

      <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
        {items.map((item) => (
          <li key={item.id} className="py-3">
            <p className="font-medium">
              {item.name} · {item.source}
            </p>
            <p className="text-stone-500">
              {item.revoked_at ? "revogada" : "ativa"}
              {item.last_used_at
                ? ` · último uso ${new Date(item.last_used_at).toLocaleString("pt-PT")}`
                : ""}
            </p>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-6 text-stone-500">Sem integrações.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
