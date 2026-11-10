"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

export default function AdminCommissionRulesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [businessId, setBusinessId] = useState<number | "">("");
  const [websiteId, setWebsiteId] = useState<number | "">("");
  const [name, setName] = useState("Default sale");
  const [rateBps, setRateBps] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage(null);
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
      setMessage("Regra criada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar regra.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/commission-rules
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Regras de comissão
        </h1>
        <p className="text-stone-600">
          Valores em basis points (1000 = 10%). Precedência por prioridade e
          versão.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <form className="flex flex-col gap-3" onSubmit={onCreate}>
        <label className="flex flex-col gap-1 text-sm">
          Business
          <select
            className="rounded-md border border-stone-300 px-3 py-2"
            value={businessId}
            onChange={(e) =>
              setBusinessId(e.target.value ? Number(e.target.value) : "")
            }
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
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Criar regra
        </button>
      </form>

      <ul className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
        {rules.map((rule) => (
          <li key={rule.id} className="py-3">
            <p className="font-medium">
              {rule.name} · v{rule.version}
            </p>
            <p className="text-stone-500">
              {rule.event_type} · {rule.rate_bps} bps · prio {rule.priority}
              {rule.is_active ? "" : " · inativa"}
            </p>
          </li>
        ))}
        {rules.length === 0 ? (
          <li className="py-6 text-stone-500">Sem regras.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
