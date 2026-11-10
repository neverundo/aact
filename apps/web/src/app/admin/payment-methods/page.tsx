"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type PaymentMethod = {
  id: number;
  uuid: string;
  method_type: string;
  display_mask: string;
  status: string;
  version: number;
};

export default function AdminPaymentMethodsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, unknown>>({});

  async function load() {
    const response = await apiFetch<{ data: PaymentMethod[] }>(
      "/api/v1/admin/payment-methods?status=pending_review",
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
      }
    })();
  }, [router]);

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

  async function reveal(id: number) {
    setError(null);
    try {
      await apiFetch("/api/v1/auth/step-up", {
        method: "POST",
        body: JSON.stringify({ method: "password", password: window.prompt("Password para step-up:") }),
      });
      const response = await apiFetch<{ payload: unknown }>(
        `/api/v1/admin/payment-methods/${id}/reveal`,
        { method: "POST" },
      );
      setRevealed((prev) => ({ ...prev, [id]: response.payload }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reveal exige step-up recente.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/payment-methods
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Métodos de pagamento
        </h1>
        <p className="text-stone-600">
          A UI mostra máscaras. O payload completo só após step-up e fica
          auditado.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  #{item.id} · {item.method_type} · v{item.version}
                </p>
                <p className="font-mono text-sm text-stone-600">
                  {item.display_mask}
                </p>
                {revealed[item.id] ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-stone-100 p-2 text-xs">
                    {JSON.stringify(revealed[item.id], null, 2)}
                  </pre>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                  onClick={() => review(item.id, "approved")}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => review(item.id, "rejected")}
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                  onClick={() => reveal(item.id)}
                >
                  Reveal
                </button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-6 text-sm text-stone-500">
            Sem métodos pendentes.
          </li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
