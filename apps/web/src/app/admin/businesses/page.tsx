"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

type Business = {
  id: number;
  name: string;
  slug: string;
  currency: string;
  is_active: boolean;
};

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        if (me.session.mfa_setup_only) {
          router.replace("/admin/security?setup=1");
          return;
        }
        const response = await apiFetch<{ data: Business[] }>(
          "/api/v1/admin/businesses",
        );
        setBusinesses(response.data);
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

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
          /admin/businesses
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Businesses</h1>
        <p className="text-stone-600">
          Listagem isolada por membership. A autorização efetiva está no
          Laravel.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {businesses.map((business) => (
          <li key={business.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{business.name}</p>
              <p className="text-sm text-stone-500">
                {business.slug} · {business.currency}
              </p>
            </div>
            <span className="text-xs text-stone-500">
              {business.is_active ? "ativo" : "inativo"}
            </span>
          </li>
        ))}
        {businesses.length === 0 && !error ? (
          <li className="py-6 text-sm text-stone-500">Sem businesses.</li>
        ) : null}
      </ul>

      <Link href="/admin" className="text-sm underline-offset-2 hover:underline">
        Voltar
      </Link>
    </main>
  );
}
